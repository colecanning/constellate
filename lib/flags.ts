/**
 * Turning engine FlagDrafts into Flags, plus de-duplication.
 *
 * The engine emits pure {@link FlagDraft}s (no id/clock). The seed and the store finalize
 * them here, and use {@link dedupeDrafts} so re-evaluating a patient never stacks a second
 * open Flag for a Trigger that's already raised.
 */

import type { Flag, FlagStatus, ISODateTime } from "@/lib/types";
import type { FlagDraft } from "@/lib/engine";

export function flagDedupeKey(patientId: string, triggerId: string): string {
  return `${patientId}::${triggerId}`;
}

export function flagFromDraft(
  draft: FlagDraft,
  id: string,
  createdAt: ISODateTime,
  status: FlagStatus = "open",
): Flag {
  return { ...draft, id, createdAt, status };
}

/** Drafts that don't already have an open (or snoozed) Flag for the same trigger. */
export function dedupeDrafts(existing: Flag[], drafts: FlagDraft[]): FlagDraft[] {
  const live = new Set(
    existing
      .filter((f) => f.status === "open" || f.status === "snoozed")
      .map((f) => flagDedupeKey(f.patientId, f.triggerId)),
  );
  const seen = new Set<string>();
  return drafts.filter((d) => {
    const key = flagDedupeKey(d.patientId, d.triggerId);
    if (live.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
