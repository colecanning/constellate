/**
 * Maps a fired Trigger + context to the suggested Action shown on its Flag.
 *
 * Regulatory note: copy frames the system as executing the provider's own rule
 * ("crossed the threshold you set", "per the MTX monitoring rule") — never as the system
 * making the clinical call.
 */

import type {
  CarePlan,
  Measure,
  Patient,
  SuggestedAction,
  SymptomKey,
  TriggerDef,
} from "@/lib/types";
import { LAB_PANEL } from "@/lib/clinical/labSchedule";
import { BUCKET_LABELS, DRUG_LABELS, SYMPTOM_LABELS } from "@/lib/labels";

export interface SuggestionContext {
  patient: Patient;
  carePlan: CarePlan;
  measure?: Measure;
  presentSymptoms?: SymptomKey[];
}

export function suggestedActionFor(
  trigger: TriggerDef,
  ctx: SuggestionContext,
): SuggestedAction {
  const drug = DRUG_LABELS[ctx.carePlan.currentRung.drug];

  switch (trigger.type) {
    case "lab_due":
      return {
        type: "order_labs",
        label: `Order ${LAB_PANEL}`,
        detail: `Per the ${drug} monitoring rule. Don't draw within 1–2 days of the weekly dose.`,
        params: { panel: LAB_PANEL },
      };

    case "red_flag_symptom": {
      const named = (ctx.presentSymptoms ?? [])
        .map((s) => SYMPTOM_LABELS[s].toLowerCase())
        .join(", ");
      return {
        type: "schedule_call",
        label: "Schedule nurse call",
        detail: `Assess ${named || "the reported symptom"} before the next ${drug} dose — ${drug} is immunosuppressive.`,
        params: { symptoms: ctx.presentSymptoms },
      };
    }

    case "rapid3_rise": {
      const bucket = ctx.measure ? BUCKET_LABELS[ctx.measure.bucket] : "a higher band";
      return {
        type: "request_visit",
        label: "Request visit to reassess",
        detail: `RAPID3 rose into ${bucket.toLowerCase()} — bring in to reassess therapy for a possible flare.`,
      };
    }

    case "rapid3_threshold":
      return {
        type: "adjust_medication",
        label: "Review medication",
        detail: `Disease activity above your threshold — consider advancing the ladder per your plan.`,
      };

    case "reengagement":
      return {
        type: "message_patient",
        label: "Send check-in reminder",
        detail: `No check-in received within the window you set. Nudge, then decide if outreach is needed.`,
      };
  }
}
