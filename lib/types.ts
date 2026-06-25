/**
 * Constellate domain model.
 *
 * These types use the EXACT glossary vocabulary from the spec — Protocol (template),
 * Care Plan (per-patient instance), Trigger (rule), Flag (raised item), Action Queue
 * (list of Flags), Disposition (recorded resolution), Patient Status (≠ Care Plan), etc.
 * Keep names stable: code, mock data, and (future) Supabase tables all reference them.
 */

// ───────────────────────── primitives ─────────────────────────

/** Calendar date, `YYYY-MM-DD`. */
export type ISODate = string;
/** Instant, ISO-8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`). */
export type ISODateTime = string;

export type Condition = "RA" | "PsA" | "SLE" | "axSpA";

export type DrugName =
  | "methotrexate"
  | "hydroxychloroquine"
  | "sulfasalazine"
  | "leflunomide"
  | "adalimumab" // biologic (TNF inhibitor)
  | "etanercept" // biologic (TNF inhibitor)
  | "folic acid";

/** How a patient interacts. Both feed the SAME Check-in + Message records. */
export type Channel = "sms" | "portal";

/** RAPID3 disease-activity buckets. */
export type Rapid3Bucket = "remission" | "low" | "moderate" | "high";

/** Treat-to-target goal state. */
export type TargetState = "remission" | "low";

/** Urgency ranking that orders the Action Queue. */
export type Severity = "urgent" | "warning" | "stable";

/** Self-reported symptoms collected alongside the RAPID3 measures in a check-in. */
export type SymptomKey =
  | "joint_swelling"
  | "morning_stiffness"
  | "fatigue"
  | "fever"
  | "chills"
  | "sore_throat"
  | "cough"
  | "mouth_sores"
  | "nausea"
  | "hair_loss"
  | "rash";

/** Red-flag (infection-on-immunosuppression) symptoms. */
export const RED_FLAG_SYMPTOMS: SymptomKey[] = [
  "fever",
  "chills",
  "sore_throat",
  "cough",
];

/** Drugs that are immunosuppressive (relevant to the red-flag trigger). */
export const IMMUNOSUPPRESSANTS: DrugName[] = [
  "methotrexate",
  "leflunomide",
  "adalimumab",
  "etanercept",
];

// ───────────────────────── Protocol (template) ─────────────────────────

export type TriggerKind = "checkin" | "time";

export type TriggerType =
  | "rapid3_threshold" // check-in: score crossed an absolute threshold
  | "rapid3_rise" // check-in: bucket rose vs. last check-in (flare)
  | "red_flag_symptom" // check-in: infection sign on an immunosuppressant
  | "lab_due" // time: monitoring labs are due
  | "reengagement"; // time: patient has gone silent

/** Closed set of things a provider can do on a Flag. */
export type ActionType =
  // Clinical
  | "message_patient"
  | "schedule_call"
  | "order_labs"
  | "adjust_medication"
  // Plan / visit
  | "adjust_care_plan"
  | "request_visit"
  // Queue hygiene
  | "add_chart_note"
  | "dismiss"
  | "snooze"
  | "escalate";

/**
 * Tunable parameters for a Trigger. A Protocol sets defaults; a Care Plan may override
 * any subset per patient (see {@link ThresholdOverrides}). Only the fields relevant to a
 * given {@link TriggerType} are read by the engine.
 */
export interface TriggerConfig {
  /** rapid3_threshold: fire when RAPID3 value > this. */
  rapid3Threshold?: number;
  /** rapid3_rise: number of bucket steps up that counts as a flare (default 1). */
  riseBuckets?: number;
  /** red_flag_symptom: which reported symptoms are treated as red flags. */
  symptoms?: SymptomKey[];
  /** red_flag_symptom: only fire if the patient is on an immunosuppressant. */
  requiresImmunosuppressant?: boolean;
  /** lab_due: fire when within this many days of `nextLabDueDate` (default 0). */
  labWindowDays?: number;
  /** reengagement: fire after cadence + this many days of silence. */
  silenceDays?: number;
}

/** A rule in a Protocol that raises a Flag. The Threshold lives in `config`. */
export interface TriggerDef {
  id: string;
  kind: TriggerKind;
  type: TriggerType;
  /** Provider-facing label for the Threshold editor. */
  label: string;
  /** Explains what this trigger watches (provider-facing). */
  description: string;
  config: TriggerConfig;
  severityOnFire: Severity;
  suggestedActionType: ActionType;
  enabled: boolean;
}

/** Reusable template at the disease/drug level (e.g. "RA on methotrexate"). */
export interface Protocol {
  id: string;
  name: string;
  condition: Condition;
  drug: DrugName;
  target: TargetState;
  defaultCadenceDays: number;
  description: string;
  triggers: TriggerDef[];
}

// ───────────────────────── Care Plan (per-patient instance) ─────────────────────────

/** The current rung on the medication ladder + the monitoring cadence it requires. */
export interface LadderRung {
  drug: DrugName;
  dose: string; // e.g. "15 mg weekly"
  startDate: ISODate;
  lastDoseChangeDate: ISODate | null;
}

/**
 * Per-Care-Plan overrides of a Protocol's Trigger thresholds, keyed by `triggerId`.
 * Resolved config = { ...protocolTrigger.config, ...override }. This is where the
 * provider's editable clinical judgment lives.
 */
export type ThresholdOverrides = Record<
  string,
  (Partial<TriggerConfig> & { enabled?: boolean }) | undefined
>;

/** A Protocol instantiated for one patient. */
export interface CarePlan {
  id: string;
  patientId: string;
  protocolId: string;
  target: TargetState;
  currentRung: LadderRung;
  cadenceDays: number;
  thresholds: ThresholdOverrides;
  nextLabDueDate: ISODate | null;
  lastLabDate: ISODate | null;
  nextVisitDate: ISODate | null;
}

// ───────────────────────── Enrollment ─────────────────────────

export interface Enrollment {
  id: string;
  patientId: string;
  protocolId: string;
  consentAt: ISODateTime;
  phone: string;
  conditions: Condition[];
  treatment: string;
  channelPrefs: Channel[];
}

// ───────────────────────── Check-in, Measure, Message ─────────────────────────

/** Raw RAPID3 self-report inputs. */
export interface Rapid3Answers {
  /** 10 MDHAQ function (ADL) items, each 0–3. */
  functionItems: number[];
  /** Pain VAS, 0–10. */
  pain: number;
  /** Patient global VAS, 0–10. */
  globalHealth: number;
}

export interface SymptomAnswers {
  symptoms: SymptomKey[];
  /** Optional self-reported temperature (°F). */
  temperatureF?: number;
  note?: string;
}

export interface CheckInAnswers {
  rapid3: Rapid3Answers;
  symptoms: SymptomAnswers;
}

/** The three RAPID3 sub-scores, each on a 0–10 scale. */
export interface Rapid3Components {
  function: number;
  pain: number;
  globalHealth: number;
}

/** A computed value derived from a Check-in — distinct from the raw answers. */
export interface Measure {
  id: string;
  checkInId: string;
  type: "RAPID3";
  value: number; // 0–30
  components: Rapid3Components;
  bucket: Rapid3Bucket;
  createdAt: ISODateTime;
}

/** The conversation cycle collecting patient-reported data on a cadence. */
export interface CheckIn {
  id: string;
  patientId: string;
  carePlanId: string;
  channel: Channel;
  createdAt: ISODateTime;
  answers: CheckInAnswers;
  measures: Measure[];
  status: "received" | "processed";
}

/** A single message in the patient↔practice thread (either Channel). */
export interface Message {
  id: string;
  patientId: string;
  channel: Channel;
  direction: "inbound" | "outbound";
  body: string;
  createdAt: ISODateTime;
}

// ───────────────────────── Flag, Action, Disposition ─────────────────────────

export interface SuggestedAction {
  type: ActionType;
  label: string;
  detail?: string;
  params?: Record<string, unknown>;
}

export interface FlagSignal {
  headline: string;
  /** Threshold-anchored explanation ("crossed the threshold YOU set"). */
  detail: string;
  metric?: { label: string; value: string };
}

export interface PlanContext {
  drug: DrugName;
  dose: string;
  weeksOnTherapy?: number;
  target: TargetState;
  latestBucket?: Rapid3Bucket;
  nextLabDueDate?: ISODate | null;
}

export type FlagStatus = "open" | "resolved" | "snoozed" | "dismissed";

/** A triggered item surfaced to the provider — the "card." */
export interface Flag {
  id: string;
  patientId: string;
  carePlanId: string;
  triggerId: string;
  triggerType: TriggerType;
  kind: TriggerKind;
  severity: Severity;
  signal: FlagSignal;
  planContext: PlanContext;
  suggestedAction: SuggestedAction;
  createdAt: ISODateTime;
  status: FlagStatus;
  disposition?: Disposition;
  snoozedUntil?: ISODate;
}

/** A discrete thing a provider does on a Flag. */
export interface Action {
  id: string;
  flagId: string;
  type: ActionType;
  params?: Record<string, unknown>;
  note?: string;
  takenBy: string;
  takenAt: ISODateTime;
}

/** The recorded resolution when a Flag is closed — audit trail / future training data. */
export interface Disposition {
  id: string;
  flagId: string;
  actionType: ActionType;
  reason: string;
  resolvedBy: string;
  resolvedAt: ISODateTime;
}

// ───────────────────────── Patient & Status ─────────────────────────

/** A patient's current clinical state — derived, distinct from the Care Plan. */
export interface PatientStatus {
  latestScore: Measure | null;
  bucket: Rapid3Bucket | null;
  currentRung: LadderRung;
  lastCheckinAt: ISODateTime | null;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex?: "F" | "M";
  phone: string;
  conditions: Condition[];
  enrollmentId: string;
  carePlanId: string;
}

export interface Provider {
  id: string;
  name: string;
  role: string;
}

// ───────────────────────── Aggregate demo dataset ─────────────────────────

/** The full mock dataset the store is seeded from. */
export interface ConstellateData {
  provider: Provider;
  protocols: Protocol[];
  patients: Patient[];
  enrollments: Enrollment[];
  carePlans: CarePlan[];
  checkIns: CheckIn[];
  messages: Message[];
  flags: Flag[];
  actions: Action[];
  /** Simulated "today" for deterministic time-driven triggers. */
  asOf: ISODate;
}
