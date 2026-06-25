"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useConstellateStore,
  actionQueue,
} from "@/lib/store/useConstellateStore";
import { FlagCard } from "@/components/queue/flag-card";
import { FlagDetail } from "@/components/queue/flag-detail";
import { TONE_STYLES, type Tone } from "@/lib/ui";
import type { Flag, Severity } from "@/lib/types";

const GROUPS: { severity: Severity; tone: Tone; label: string }[] = [
  { severity: "urgent", tone: "urgent", label: "Urgent" },
  { severity: "warning", tone: "warning", label: "Warning" },
  { severity: "stable", tone: "normal", label: "Stable" },
];

export default function ActionQueuePage() {
  const flags = useConstellateStore((s) => s.flags);
  const patients = useConstellateStore((s) => s.patients);
  const asOf = useConstellateStore((s) => s.asOf);
  const simulateHeroFlare = useConstellateStore((s) => s.simulateHeroFlare);

  const queue = useMemo(() => actionQueue(flags), [flags]);
  const patientById = useMemo(
    () => Object.fromEntries(patients.map((p) => [p.id, p])),
    [patients],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected: Flag | null =
    queue.find((f) => f.id === selectedId) ?? queue[0] ?? null;

  function onSimulateFlare() {
    const created = simulateHeroFlare();
    const top = created.find((f) => f.severity === "urgent") ?? created[0];
    if (top) setSelectedId(top.id);
    toast.info("Maria Reyes checked in (SMS)", {
      description: `Flare check-in processed — ${created.length} new flag${
        created.length === 1 ? "" : "s"
      } raised against her plan.`,
    });
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Page header */}
      <header className="border-border flex items-center justify-between gap-4 border-b px-6 py-4">
        <div>
          <h1 className="text-display text-ink text-xl">Action Queue</h1>
          <p className="text-ink-muted text-sm">
            {queue.length} open {queue.length === 1 ? "flag" : "flags"} · sorted by
            severity. Only patients needing a decision.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onSimulateFlare}>
          <Sparkles className="size-3.5" /> Simulate flare check-in
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Queue list */}
        <div className="w-full max-w-sm shrink-0 overflow-y-auto border-r border-border p-4">
          {queue.length === 0 ? (
            <EmptyQueue />
          ) : (
            <div className="space-y-5">
              {GROUPS.map((group) => {
                const items = queue.filter((f) => f.severity === group.severity);
                if (items.length === 0) return null;
                return (
                  <div key={group.severity}>
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <span
                        className={`size-2 rounded-full ${TONE_STYLES[group.tone].dot}`}
                      />
                      <span className="text-label text-ink-muted uppercase">
                        {group.label}
                      </span>
                      <span className="text-label text-ink-subtle tabular-nums">
                        {items.length}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {items.map((flag) => (
                        <FlagCard
                          key={flag.id}
                          flag={flag}
                          patient={patientById[flag.patientId]}
                          asOf={asOf}
                          selected={selected?.id === flag.id}
                          onSelect={() => setSelectedId(flag.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {selected ? (
            <FlagDetail
              key={selected.id}
              flag={selected}
              onAfterAction={() => setSelectedId(null)}
            />
          ) : (
            <EmptyQueue centered />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyQueue({ centered }: { centered?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${
        centered ? "h-full" : "py-16"
      }`}
    >
      <span className="bg-normal-bg text-normal flex size-12 items-center justify-center rounded-full">
        <CheckCircle2 className="size-6" />
      </span>
      <div>
        <p className="text-ink font-medium">Queue clear</p>
        <p className="text-ink-muted text-sm">
          No patients need a decision right now.
        </p>
      </div>
    </div>
  );
}
