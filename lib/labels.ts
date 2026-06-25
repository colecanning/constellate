/**
 * Human-readable labels for enum-like domain values. Shared by the engine (for flag /
 * suggested-action copy) and the UI. Keeping them in one place avoids drift.
 */

import type {
  ActionType,
  DrugName,
  Rapid3Bucket,
  Severity,
  SymptomKey,
  TriggerType,
} from "@/lib/types";

export const ACTION_LABELS: Record<ActionType, string> = {
  message_patient: "Message patient",
  schedule_call: "Schedule call",
  order_labs: "Order labs",
  adjust_medication: "Adjust medication",
  adjust_care_plan: "Adjust care plan",
  request_visit: "Request visit",
  add_chart_note: "Add chart note",
  dismiss: "Dismiss",
  snooze: "Snooze",
  escalate: "Escalate",
};

export const SYMPTOM_LABELS: Record<SymptomKey, string> = {
  joint_swelling: "Joint swelling",
  morning_stiffness: "Morning stiffness",
  fatigue: "Fatigue",
  fever: "Fever",
  chills: "Chills",
  sore_throat: "Sore throat",
  cough: "Cough",
  mouth_sores: "Mouth sores",
  nausea: "Nausea",
  hair_loss: "Hair loss",
  rash: "Rash",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  urgent: "Urgent",
  warning: "Warning",
  stable: "Stable",
};

export const BUCKET_LABELS: Record<Rapid3Bucket, string> = {
  remission: "Near remission",
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  rapid3_threshold: "RAPID3 threshold",
  rapid3_rise: "RAPID3 flare (rise)",
  red_flag_symptom: "Red-flag symptom",
  lab_due: "Labs due",
  reengagement: "Re-engagement",
};

export const DRUG_LABELS: Record<DrugName, string> = {
  methotrexate: "Methotrexate",
  hydroxychloroquine: "Hydroxychloroquine",
  sulfasalazine: "Sulfasalazine",
  leflunomide: "Leflunomide",
  adalimumab: "Adalimumab",
  etanercept: "Etanercept",
  "folic acid": "Folic acid",
};
