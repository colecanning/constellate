/**
 * RAPID3 — Routine Assessment of Patient Index Data 3.
 *
 * A validated disease-activity score computed from THREE patient self-report measures
 * only (function, pain, patient global) — no labs, no joint count — so it is computable
 * entirely from a check-in.
 *
 *   Function (FN): 10 MDHAQ ADL items, each 0–3 → raw sum 0–30 → ÷3 → 0–10
 *   Pain (PN):     patient VAS, 0–10
 *   Global (PtGl): patient global VAS, 0–10
 *   RAPID3 = FN + PN + PtGl, range 0–30
 *
 * Buckets:  remission ≤3 · low >3–6 · moderate >6–12 · high >12
 *
 * Pure & framework-free so it is trivially unit-testable and reusable from both the
 * client store and the API routes.
 */

import type { Rapid3Answers, Rapid3Bucket, Rapid3Components } from "@/lib/types";

export const RAPID3_FUNCTION_ITEM_COUNT = 10;
export const RAPID3_MAX = 30;

/** Bucket boundaries (upper-inclusive), exported for the threshold editor / tests. */
export const RAPID3_BUCKET_CUTOFFS = {
  remission: 3,
  low: 6,
  moderate: 12,
} as const;

export interface Rapid3Result {
  components: Rapid3Components; // each 0–10
  value: number; // 0–30
  bucket: Rapid3Bucket;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function bucketRapid3(value: number): Rapid3Bucket {
  if (value <= RAPID3_BUCKET_CUTOFFS.remission) return "remission";
  if (value <= RAPID3_BUCKET_CUTOFFS.low) return "low";
  if (value <= RAPID3_BUCKET_CUTOFFS.moderate) return "moderate";
  return "high";
}

/** Ordinal rank of a bucket (0 = remission … 3 = high), for comparing change. */
export function bucketRank(bucket: Rapid3Bucket): number {
  return ["remission", "low", "moderate", "high"].indexOf(bucket);
}

/** FN: sum of 10 ADL items (each clamped 0–3) → divided by 3 → 0–10. */
export function computeFunctionScore(items: number[]): number {
  const raw = items.reduce<number>((sum, v) => sum + clamp(v, 0, 3), 0);
  return round1(raw / 3);
}

export function computeRapid3(answers: Rapid3Answers): Rapid3Result {
  const fn = computeFunctionScore(answers.functionItems);
  const pain = round1(clamp(answers.pain, 0, 10));
  const globalHealth = round1(clamp(answers.globalHealth, 0, 10));
  const value = round1(fn + pain + globalHealth);
  return {
    components: { function: fn, pain, globalHealth },
    value,
    bucket: bucketRapid3(value),
  };
}

/** Provider-facing label for a bucket. */
export function bucketLabel(bucket: Rapid3Bucket): string {
  return {
    remission: "Near remission",
    low: "Low",
    moderate: "Moderate",
    high: "High",
  }[bucket];
}
