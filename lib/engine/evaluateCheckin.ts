/**
 * Check-in-driven Trigger evaluation: a patient reply ran against their Care Plan.
 *
 * Produces a FlagDraft for each enabled check-in Trigger whose Threshold was crossed:
 *   1. rapid3_rise     — bucket rose vs. the previous check-in (flare)
 *   2. rapid3_threshold — absolute RAPID3 above the threshold the provider set
 *   3. red_flag_symptom — infection sign reported on an immunosuppressant
 *
 * Pure: no ids, no clock. The store finalizes drafts into Flags.
 */

import type {
  CarePlan,
  CheckIn,
  Measure,
  Patient,
  PlanContext,
  Protocol,
  SymptomKey,
} from "@/lib/types";
import { IMMUNOSUPPRESSANTS } from "@/lib/types";
import { bucketRank } from "@/lib/clinical/rapid3";
import { weeksBetween } from "@/lib/dates";
import { BUCKET_LABELS } from "@/lib/labels";
import { FlagDraft, resolveTrigger } from "@/lib/engine/resolve";
import { suggestedActionFor } from "@/lib/engine/suggestedAction";

export interface EvaluateCheckinInput {
  checkIn: CheckIn;
  measure: Measure;
  previousMeasure: Measure | null;
  carePlan: CarePlan;
  protocol: Protocol;
  patient: Patient;
}

export function evaluateCheckin(input: EvaluateCheckinInput): FlagDraft[] {
  const { checkIn, measure, previousMeasure, carePlan, protocol, patient } = input;
  const checkInDate = checkIn.createdAt.slice(0, 10);
  const drafts: FlagDraft[] = [];

  const planContext: PlanContext = {
    drug: carePlan.currentRung.drug,
    dose: carePlan.currentRung.dose,
    weeksOnTherapy: weeksBetween(carePlan.currentRung.startDate, checkInDate),
    target: carePlan.target,
    latestBucket: measure.bucket,
    nextLabDueDate: carePlan.nextLabDueDate,
  };

  const presentSymptoms = checkIn.answers.symptoms.symptoms;

  for (const trigger of protocol.triggers) {
    if (trigger.kind !== "checkin") continue;
    const { config, enabled } = resolveTrigger(trigger, carePlan);
    if (!enabled) continue;

    const base = {
      patientId: patient.id,
      carePlanId: carePlan.id,
      triggerId: trigger.id,
      triggerType: trigger.type,
      kind: trigger.kind,
      severity: trigger.severityOnFire,
      planContext,
    };

    switch (trigger.type) {
      case "rapid3_threshold": {
        const threshold = config.rapid3Threshold ?? 6;
        if (measure.value > threshold) {
          drafts.push({
            ...base,
            signal: {
              headline: `RAPID3 above your threshold (> ${threshold})`,
              detail: `RAPID3 is ${measure.value} — it crossed the threshold you set (> ${threshold}).`,
              metric: { label: "RAPID3", value: `${measure.value}` },
            },
            suggestedAction: suggestedActionFor(trigger, { patient, carePlan, measure }),
          });
        }
        break;
      }

      case "rapid3_rise": {
        const steps = config.riseBuckets ?? 1;
        if (
          previousMeasure &&
          bucketRank(measure.bucket) - bucketRank(previousMeasure.bucket) >= steps
        ) {
          drafts.push({
            ...base,
            signal: {
              headline: `RAPID3 rose ${BUCKET_LABELS[previousMeasure.bucket].toLowerCase()} → ${BUCKET_LABELS[measure.bucket].toLowerCase()}`,
              detail: `RAPID3 moved from ${previousMeasure.value} (${BUCKET_LABELS[previousMeasure.bucket].toLowerCase()}) to ${measure.value} (${BUCKET_LABELS[measure.bucket].toLowerCase()}) — a rise across the bands you flagged on.`,
              metric: { label: "RAPID3", value: `${previousMeasure.value} → ${measure.value}` },
            },
            suggestedAction: suggestedActionFor(trigger, { patient, carePlan, measure }),
          });
        }
        break;
      }

      case "red_flag_symptom": {
        const watched = config.symptoms ?? [];
        const present = presentSymptoms.filter((s: SymptomKey) => watched.includes(s));
        const onImmunosuppressant = IMMUNOSUPPRESSANTS.includes(
          carePlan.currentRung.drug,
        );
        const gate = config.requiresImmunosuppressant ? onImmunosuppressant : true;
        if (present.length > 0 && gate) {
          const names = present.map((s) => s.replace(/_/g, " ")).join(", ");
          drafts.push({
            ...base,
            signal: {
              headline: `Red-flag symptom on ${planContext.drug}: ${names}`,
              detail: `Patient reported ${names} while on an immunosuppressant — the red-flag rule you enabled fired.`,
              metric: checkIn.answers.symptoms.temperatureF
                ? { label: "Temp", value: `${checkIn.answers.symptoms.temperatureF}°F` }
                : undefined,
            },
            suggestedAction: suggestedActionFor(trigger, {
              patient,
              carePlan,
              measure,
              presentSymptoms: present,
            }),
          });
        }
        break;
      }

      // time-driven triggers are handled by evaluateTime
      case "lab_due":
      case "reengagement":
        break;
    }
  }

  return drafts;
}
