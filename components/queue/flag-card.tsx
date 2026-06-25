"use client";

import { cn } from "@/lib/utils";
import { flagTone, TONE_STYLES } from "@/lib/ui";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { TRIGGER_TYPE_LABELS } from "@/lib/labels";
import { relativeToToday } from "@/lib/dates";
import type { Flag, ISODate, Patient } from "@/lib/types";

/**
 * One Flag in the Action Queue. DESIGN: status shows as a left accent stripe + a small
 * paired-tint badge — never a full-bleed colored card.
 */
export function FlagCard({
  flag,
  patient,
  asOf,
  selected,
  onSelect,
}: {
  flag: Flag;
  patient: Patient;
  asOf: ISODate;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = flagTone(flag);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full border-l-4 bg-canvas px-4 py-3 text-left transition-colors",
        "border-y border-r border-border first:rounded-t-lg last:rounded-b-lg",
        "hover:bg-surface-1",
        TONE_STYLES[tone].stripe,
        selected && "bg-primary-light/40 ring-primary/40 relative z-10 ring-1",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-ink truncate font-medium">{patient.name}</span>
        <SeverityBadge tone={tone} />
      </div>
      <p className="text-ink-muted line-clamp-2 text-sm">{flag.signal.headline}</p>
      <div className="text-ink-subtle text-label mt-1.5 flex items-center gap-2">
        <span>{TRIGGER_TYPE_LABELS[flag.triggerType]}</span>
        <span aria-hidden>·</span>
        <span>{relativeToToday(flag.createdAt.slice(0, 10), asOf)}</span>
      </div>
    </button>
  );
}
