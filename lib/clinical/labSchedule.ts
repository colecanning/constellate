/**
 * Lab-monitoring schedule — the deterministic, time-driven side of the engine.
 *
 * For MTX / most csDMARDs the monitoring panel is CBC + LFTs + creatinine, drawn:
 *   baseline → ~1 month after start → ~6 weeks after any dose increase → every ~3 months
 *   once stable (tighter early).
 *
 * `nextLabDue` reduces `drug + startDate + lastDoseChangeDate + lastLabDate` to the next
 * due date — a pure function so the time-driven trigger is fully testable.
 *
 * Scheduling caveat surfaced on the suggested action (not enforced here): don't draw labs
 * within 1–2 days of the MTX dose.
 */

import type { DrugName, ISODate } from "@/lib/types";
import { addDays, daysBetween, isOnOrBefore, weeksBetween } from "@/lib/dates";

/** The standard csDMARD monitoring panel. */
export const LAB_PANEL = "CBC + LFTs + creatinine";

/** Drugs that require routine CBC/LFT/creatinine monitoring on this cadence. */
export const MONITORED_DRUGS: DrugName[] = [
  "methotrexate",
  "leflunomide",
  "sulfasalazine",
];

const FIRST_LAB_DAYS = 30; // ~1 month after start (baseline assumed at start)
const POST_DOSE_CHANGE_DAYS = 42; // ~6 weeks after a dose increase
const EARLY_PHASE_DAYS = 30; // monthly while still ramping
const STABLE_INTERVAL_DAYS = 90; // every ~3 months once stable
const EARLY_PHASE_WEEKS = 12; // first ~3 months count as "early"

export function labsMonitored(drug: DrugName): boolean {
  return MONITORED_DRUGS.includes(drug);
}

export interface NextLabDueInput {
  drug: DrugName;
  startDate: ISODate;
  lastDoseChangeDate: ISODate | null;
  lastLabDate: ISODate | null;
}

/**
 * Next monitoring-lab due date, or `null` for drugs without routine bloodwork.
 *
 * Precedence: a dose change after the last lab tightens cadence (6 wks); otherwise the
 * early phase (first ~12 weeks) is monthly and stable maintenance is quarterly. With no
 * prior lab, the first draw is ~1 month after start.
 */
export function nextLabDue(input: NextLabDueInput): ISODate | null {
  const { drug, startDate, lastDoseChangeDate, lastLabDate } = input;
  if (!labsMonitored(drug)) return null;

  if (!lastLabDate) {
    return addDays(startDate, FIRST_LAB_DAYS);
  }

  // A dose increase since the last lab → recheck ~6 weeks after the change.
  if (lastDoseChangeDate && isOnOrBefore(lastLabDate, lastDoseChangeDate)) {
    return addDays(lastDoseChangeDate, POST_DOSE_CHANGE_DAYS);
  }

  // Still ramping in the first ~3 months → monthly; otherwise stable → quarterly.
  const interval =
    weeksBetween(startDate, lastLabDate) < EARLY_PHASE_WEEKS
      ? EARLY_PHASE_DAYS
      : STABLE_INTERVAL_DAYS;
  return addDays(lastLabDate, interval);
}

/** True if labs are due as of `asOf` (optionally within a look-ahead window of N days). */
export function isLabDue(
  nextLabDueDate: ISODate | null,
  asOf: ISODate,
  windowDays = 0,
): boolean {
  if (!nextLabDueDate) return false;
  return daysBetween(asOf, nextLabDueDate) <= windowDays;
}
