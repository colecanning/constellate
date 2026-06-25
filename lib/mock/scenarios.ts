/**
 * Scripted demo scenarios.
 *
 * The hero flare: Maria Reyes (week-10 MTX) reports ↑swelling + fatigue + low fever. Run
 * through the live engine this produces RAPID3 9.0 (low→moderate flare) and trips the
 * red-flag symptom rule — which, alongside her already-open labs-due flag, surfaces three
 * flags at the top of the Action Queue.
 */

import type { CheckInAnswers } from "@/lib/types";

export { HERO_PATIENT_ID } from "@/lib/mock/seed";

/** The flare check-in payload submitted by the "Simulate hero flare check-in" control. */
export function heroFlareCheckInAnswers(): CheckInAnswers {
  return {
    rapid3: {
      functionItems: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // FN 3.0
      pain: 3,
      globalHealth: 3,
    }, // → RAPID3 9.0 (moderate)
    symptoms: {
      symptoms: ["joint_swelling", "fatigue", "fever"],
      temperatureF: 100.6,
      note: "More swelling in my hands this week, very tired, and a low fever.",
    },
  };
}
