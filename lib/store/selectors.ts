/**
 * Pure selectors over Constellate data. No "use client" — so both the Zustand store and
 * the server-side mock API routes can share them.
 *
 * Exported as plain functions (not store methods) so client components can memoize derived
 * values with `useMemo` and avoid re-rendering on every store read.
 */

import type {
  CarePlan,
  CheckIn,
  Flag,
  Measure,
  Message,
  PatientStatus,
  Severity,
} from "@/lib/types";

const SEVERITY_RANK: Record<Severity, number> = { urgent: 0, warning: 1, stable: 2 };

/** Open flags ordered by Severity, then most-recent first. */
export function actionQueue(flags: Flag[]): Flag[] {
  return flags
    .filter((f) => f.status === "open")
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        b.createdAt.localeCompare(a.createdAt),
    );
}

export function patientCheckIns(checkIns: CheckIn[], patientId: string): CheckIn[] {
  return checkIns
    .filter((c) => c.patientId === patientId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function patientMeasures(checkIns: CheckIn[], patientId: string): Measure[] {
  return patientCheckIns(checkIns, patientId).flatMap((c) => c.measures);
}

export function patientLatestMeasure(
  checkIns: CheckIn[],
  patientId: string,
): Measure | null {
  return patientMeasures(checkIns, patientId).at(-1) ?? null;
}

export function patientThread(messages: Message[], patientId: string): Message[] {
  return messages
    .filter((m) => m.patientId === patientId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function patientFlags(flags: Flag[], patientId: string): Flag[] {
  return flags
    .filter((f) => f.patientId === patientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Derived clinical state — distinct from the Care Plan (the rules they're on). */
export function patientStatus(checkIns: CheckIn[], carePlan: CarePlan): PatientStatus {
  const latest = patientLatestMeasure(checkIns, carePlan.patientId);
  return {
    latestScore: latest,
    bucket: latest?.bucket ?? null,
    currentRung: carePlan.currentRung,
    lastCheckinAt:
      patientCheckIns(checkIns, carePlan.patientId).at(-1)?.createdAt ?? null,
  };
}
