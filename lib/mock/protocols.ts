/**
 * The canonical demo Protocol: "RA on methotrexate".
 *
 * A Protocol is a reusable TEMPLATE (target + cadence + triggers + default thresholds)
 * shared across patients; each patient gets a Care Plan that instantiates it and may
 * override any Threshold. Defined once here so the seed and the engine tests agree.
 */

import type { Protocol } from "@/lib/types";
import { RED_FLAG_SYMPTOMS } from "@/lib/types";

export const RA_MTX_PROTOCOL_ID = "proto-ra-mtx";

/** Stable Trigger ids — referenced by Care Plan threshold overrides and the editor. */
export const TRIGGER_IDS = {
  rapid3Rise: "trg-rapid3-rise",
  rapid3Threshold: "trg-rapid3-threshold",
  redFlag: "trg-red-flag",
  labDue: "trg-lab-due",
  reengagement: "trg-reengagement",
} as const;

export function raMtxProtocol(): Protocol {
  return {
    id: RA_MTX_PROTOCOL_ID,
    name: "RA on methotrexate",
    condition: "RA",
    drug: "methotrexate",
    target: "low",
    defaultCadenceDays: 14,
    description:
      "Treat-to-target for rheumatoid arthritis on MTX monotherapy. RAPID3 check-ins on a 2-week cadence, CBC/LFT/creatinine monitoring, and red-flag screening for infection on immunosuppression.",
    triggers: [
      {
        id: TRIGGER_IDS.rapid3Rise,
        kind: "checkin",
        type: "rapid3_rise",
        label: "Flare detection — RAPID3 rise",
        description:
          "Raise a flag when RAPID3 climbs at least one disease-activity band versus the previous check-in (possible flare).",
        config: { riseBuckets: 1 },
        severityOnFire: "warning",
        suggestedActionType: "request_visit",
        enabled: true,
      },
      {
        id: TRIGGER_IDS.rapid3Threshold,
        kind: "checkin",
        type: "rapid3_threshold",
        label: "High disease activity — RAPID3 ceiling",
        description:
          "Raise a flag when an absolute RAPID3 score crosses the ceiling you set, regardless of trend.",
        config: { rapid3Threshold: 12 },
        severityOnFire: "urgent",
        suggestedActionType: "adjust_medication",
        enabled: true,
      },
      {
        id: TRIGGER_IDS.redFlag,
        kind: "checkin",
        type: "red_flag_symptom",
        label: "Infection on immunosuppression",
        description:
          "Raise an urgent flag when a fever/infection sign is reported while the patient is on an immunosuppressant.",
        config: { symptoms: RED_FLAG_SYMPTOMS, requiresImmunosuppressant: true },
        severityOnFire: "urgent",
        suggestedActionType: "schedule_call",
        enabled: true,
      },
      {
        id: TRIGGER_IDS.labDue,
        kind: "time",
        type: "lab_due",
        label: "Monitoring labs due",
        description:
          "Raise a flag when CBC/LFT/creatinine monitoring is due within the look-ahead window.",
        config: { labWindowDays: 7 },
        severityOnFire: "warning",
        suggestedActionType: "order_labs",
        enabled: true,
      },
      {
        id: TRIGGER_IDS.reengagement,
        kind: "time",
        type: "reengagement",
        label: "Re-engagement — silence",
        description:
          "Raise a low-severity flag when a patient stays silent past their cadence plus a grace period.",
        config: { silenceDays: 7 },
        severityOnFire: "stable",
        suggestedActionType: "message_patient",
        enabled: true,
      },
    ],
  };
}
