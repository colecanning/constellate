/**
 * Trigger evaluation engine — the heart of Constellate.
 *
 * Two pure evaluators run a patient's incoming signals against their Care Plan's
 * Thresholds and emit FlagDrafts:
 *   - evaluateCheckin: check-in-driven (a reply crossed a Threshold)
 *   - evaluateTime:    time-driven (a date passed / silence elapsed)
 *
 * Both are callable from the client store and the mock API routes.
 */

export type { FlagDraft } from "@/lib/engine/resolve";
export { resolveTrigger } from "@/lib/engine/resolve";
export { evaluateCheckin } from "@/lib/engine/evaluateCheckin";
export type { EvaluateCheckinInput } from "@/lib/engine/evaluateCheckin";
export { evaluateTime } from "@/lib/engine/evaluateTime";
export type { EvaluateTimeInput } from "@/lib/engine/evaluateTime";
export { suggestedActionFor } from "@/lib/engine/suggestedAction";
