/**
 * Minimal, dependency-free date helpers operating on `YYYY-MM-DD` strings in UTC.
 * Using UTC throughout keeps the demo deterministic and avoids timezone drift between
 * server render and client hydration.
 */

import type { ISODate } from "@/lib/types";

const MS_PER_DAY = 86_400_000;

export function parseISODate(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function toISODate(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: ISODate, days: number): ISODate {
  const dt = parseISODate(d);
  dt.setUTCDate(dt.getUTCDate() + days);
  return toISODate(dt);
}

/** Whole days from `a` to `b` (positive if `b` is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / MS_PER_DAY);
}

/** Whole weeks (floored) from `a` to `b`. */
export function weeksBetween(a: ISODate, b: ISODate): number {
  return Math.floor(daysBetween(a, b) / 7);
}

/** True if `a` is on or before `b`. */
export function isOnOrBefore(a: ISODate, b: ISODate): boolean {
  return parseISODate(a).getTime() <= parseISODate(b).getTime();
}

/** Human-friendly date, e.g. "Jun 24, 2026". */
export function formatDate(d: ISODate): string {
  return parseISODate(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Relative phrasing vs. a reference date: "in 3 days", "2 days ago", "today". */
export function relativeToToday(d: ISODate, today: ISODate): string {
  const delta = daysBetween(today, d);
  if (delta === 0) return "today";
  if (delta === 1) return "tomorrow";
  if (delta === -1) return "yesterday";
  if (delta > 0) return `in ${delta} days`;
  return `${Math.abs(delta)} days ago`;
}
