/**
 * Time-driven Trigger evaluation: a date passed, independent of any new check-in.
 *
 *   1. lab_due       — monitoring labs are due (or due within the look-ahead window)
 *   2. reengagement  — patient has been silent beyond cadence + grace
 *
 * Pure: takes an explicit `asOf` date (the simulated "now") so the demo's time sweep is
 * deterministic and replayable.
 */

import type {
  CarePlan,
  ISODate,
  ISODateTime,
  Patient,
  PlanContext,
  Protocol,
  Rapid3Bucket,
} from "@/lib/types";
import { isLabDue, LAB_PANEL } from "@/lib/clinical/labSchedule";
import { daysBetween, formatDate, weeksBetween } from "@/lib/dates";
import { FlagDraft, resolveTrigger } from "@/lib/engine/resolve";
import { suggestedActionFor } from "@/lib/engine/suggestedAction";

export interface EvaluateTimeInput {
  carePlan: CarePlan;
  protocol: Protocol;
  patient: Patient;
  asOf: ISODate;
  lastCheckinAt: ISODateTime | null;
  latestBucket?: Rapid3Bucket;
}

export function evaluateTime(input: EvaluateTimeInput): FlagDraft[] {
  const { carePlan, protocol, patient, asOf, lastCheckinAt, latestBucket } = input;
  const drafts: FlagDraft[] = [];

  const planContext: PlanContext = {
    drug: carePlan.currentRung.drug,
    dose: carePlan.currentRung.dose,
    weeksOnTherapy: weeksBetween(carePlan.currentRung.startDate, asOf),
    target: carePlan.target,
    latestBucket,
    nextLabDueDate: carePlan.nextLabDueDate,
  };

  for (const trigger of protocol.triggers) {
    if (trigger.kind !== "time") continue;
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
      case "lab_due": {
        const windowDays = config.labWindowDays ?? 0;
        if (isLabDue(carePlan.nextLabDueDate, asOf, windowDays)) {
          const due = carePlan.nextLabDueDate as ISODate;
          drafts.push({
            ...base,
            signal: {
              headline: `Monitoring labs due ${formatDate(due)}`,
              detail: `${LAB_PANEL} is due per the ${planContext.drug} schedule in this Care Plan.`,
              metric: { label: "Due", value: formatDate(due) },
            },
            suggestedAction: suggestedActionFor(trigger, { patient, carePlan }),
          });
        }
        break;
      }

      case "reengagement": {
        if (!lastCheckinAt) break;
        const silentDays = daysBetween(lastCheckinAt.slice(0, 10), asOf);
        const limit = carePlan.cadenceDays + (config.silenceDays ?? 0);
        if (silentDays > limit) {
          drafts.push({
            ...base,
            signal: {
              headline: `No check-in for ${silentDays} days`,
              detail: `Silence has passed the ${limit}-day window you set (cadence ${carePlan.cadenceDays}d + grace). Reminders sent; a human decides next.`,
              metric: { label: "Silent", value: `${silentDays}d` },
            },
            suggestedAction: suggestedActionFor(trigger, { patient, carePlan }),
          });
        }
        break;
      }

      case "rapid3_threshold":
      case "rapid3_rise":
      case "red_flag_symptom":
        break;
    }
  }

  return drafts;
}
