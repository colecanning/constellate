"use client";

import { Pill, Target, CalendarClock } from "lucide-react";
import { useConstellateStore } from "@/lib/store/useConstellateStore";
import { SeverityBadge } from "@/components/shared/severity-badge";
import {
  ACTION_LABELS,
  DRUG_LABELS,
  TRIGGER_TYPE_LABELS,
} from "@/lib/labels";
import { TONE_STYLES } from "@/lib/ui";
import type { Severity } from "@/lib/types";

const SEVERITY_TONE: Record<Severity, keyof typeof TONE_STYLES> = {
  urgent: "urgent",
  warning: "warning",
  stable: "normal",
};

export default function ProtocolPage() {
  const protocol = useConstellateStore((s) => s.protocols[0]);
  const carePlanCount = useConstellateStore(
    (s) => s.carePlans.filter((c) => c.protocolId === protocol.id).length,
  );

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8">
      <header className="mb-6">
        <p className="text-label text-ink-subtle uppercase">Protocol template</p>
        <h1 className="text-display text-ink text-2xl">{protocol.name}</h1>
        <p className="text-ink-muted mt-1 max-w-prose text-sm">{protocol.description}</p>
        <p className="text-ink-subtle mt-2 text-xs">
          Reusable template · instantiated by {carePlanCount} care plans. Each patient&apos;s
          Care Plan may override any threshold below.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="border-border rounded-lg border bg-canvas p-4 shadow-card">
          <Pill className="text-primary mb-1 size-4" />
          <p className="text-label text-ink-subtle uppercase">Anchor drug</p>
          <p className="text-ink text-sm">{DRUG_LABELS[protocol.drug]}</p>
        </div>
        <div className="border-border rounded-lg border bg-canvas p-4 shadow-card">
          <Target className="text-primary mb-1 size-4" />
          <p className="text-label text-ink-subtle uppercase">Target</p>
          <p className="text-ink text-sm">
            {protocol.target === "remission" ? "Remission" : "Low disease activity"}
          </p>
        </div>
        <div className="border-border rounded-lg border bg-canvas p-4 shadow-card">
          <CalendarClock className="text-primary mb-1 size-4" />
          <p className="text-label text-ink-subtle uppercase">Default cadence</p>
          <p className="text-ink text-sm">Every {protocol.defaultCadenceDays} days</p>
        </div>
      </div>

      <section className="border-border rounded-lg border bg-canvas p-5 shadow-card">
        <h2 className="text-ink mb-3 font-medium">Triggers</h2>
        <ul className="divide-border divide-y">
          {protocol.triggers.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-ink font-medium">{t.label}</span>
                  <span className="text-ink-subtle text-label uppercase">
                    {t.kind === "checkin" ? "Check-in" : "Time"} ·{" "}
                    {TRIGGER_TYPE_LABELS[t.type]}
                  </span>
                </div>
                <p className="text-ink-muted mt-0.5 text-sm">{t.description}</p>
                <p className="text-ink-subtle mt-1 text-xs">
                  Suggested action: {ACTION_LABELS[t.suggestedActionType]}
                </p>
              </div>
              <SeverityBadge tone={SEVERITY_TONE[t.severityOnFire]} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
