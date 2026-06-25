/**
 * Shared engine helpers: the FlagDraft shape the evaluators emit, and Threshold
 * resolution (Protocol defaults overlaid with per-Care-Plan overrides).
 */

import type { CarePlan, Flag, TriggerConfig, TriggerDef } from "@/lib/types";

/**
 * What the engine produces. The store finalizes a draft into a {@link Flag} by adding
 * `id`, `createdAt`, and `status` — keeping the evaluators pure (no ids, no clock).
 */
export type FlagDraft = Omit<
  Flag,
  "id" | "createdAt" | "status" | "disposition" | "snoozedUntil"
>;

export interface ResolvedTrigger {
  config: TriggerConfig;
  enabled: boolean;
}

/**
 * Effective config + enabled state for a Trigger on a given Care Plan.
 * Resolved config = Protocol defaults ← Care Plan overrides. This is the seam where the
 * provider's editable Thresholds take effect.
 */
export function resolveTrigger(trigger: TriggerDef, plan: CarePlan): ResolvedTrigger {
  const override = plan.thresholds[trigger.id];
  return {
    config: { ...trigger.config, ...(override ?? {}) },
    enabled: override?.enabled ?? trigger.enabled,
  };
}
