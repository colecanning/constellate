"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, FlaskConical, Target, Stethoscope } from "lucide-react";
import {
  useConstellateStore,
  patientMeasures,
} from "@/lib/store/useConstellateStore";
import { flagTone } from "@/lib/ui";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { Rapid3Pill } from "@/components/shared/rapid3-pill";
import { ScoreTrend } from "@/components/shared/score-trend";
import { ActionToolbar } from "@/components/queue/action-toolbar";
import { DRUG_LABELS, TRIGGER_TYPE_LABELS } from "@/lib/labels";
import { formatDate, relativeToToday } from "@/lib/dates";
import type { Flag } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-label text-ink-subtle uppercase">{label}</p>
      <div className="text-ink mt-0.5 text-sm">{children}</div>
    </div>
  );
}

export function FlagDetail({
  flag,
  onAfterAction,
}: {
  flag: Flag;
  onAfterAction?: () => void;
}) {
  const patient = useConstellateStore((s) =>
    s.patients.find((p) => p.id === flag.patientId),
  );
  const checkIns = useConstellateStore((s) => s.checkIns);
  const asOf = useConstellateStore((s) => s.asOf);
  const measures = useMemo(
    () => patientMeasures(checkIns, flag.patientId).slice(-6),
    [checkIns, flag.patientId],
  );

  if (!patient) return null;
  const tone = flagTone(flag);
  const ctx = flag.planContext;

  return (
    <div className="animate-in fade-in slide-in-from-right-2 flex h-full flex-col duration-200">
      {/* Header */}
      <div className="border-border flex items-start justify-between gap-3 border-b p-6">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <SeverityBadge tone={tone} />
            <span className="text-ink-subtle text-label">
              {TRIGGER_TYPE_LABELS[flag.triggerType]} ·{" "}
              {relativeToToday(flag.createdAt.slice(0, 10), asOf)}
            </span>
          </div>
          <Link
            href={`/console/patients/${patient.id}`}
            className="text-display text-ink hover:text-primary inline-flex items-center gap-1 text-xl"
          >
            {patient.name}
            <ArrowUpRight className="size-4" />
          </Link>
          <p className="text-ink-muted text-sm">
            {patient.age} · {patient.sex === "F" ? "Female" : "Male"} ·{" "}
            {patient.conditions.join(", ")}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {/* Signal — the reason this flag fired, surfaced first */}
        <section className="border-border rounded-lg border bg-surface-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-ink font-medium">{flag.signal.headline}</h3>
              <p className="text-ink-muted mt-1 text-sm">{flag.signal.detail}</p>
            </div>
            {flag.signal.metric && (
              <div className="shrink-0 text-right">
                <p className="text-label text-ink-subtle uppercase">
                  {flag.signal.metric.label}
                </p>
                <p className="font-numeric text-ink text-lg tabular-nums">
                  {flag.signal.metric.value}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Take action — combined suggested action + toolset */}
        <section className="border-border rounded-lg border p-4">
          <h4 className="text-label text-ink-subtle mb-3 uppercase">Take action</h4>
          <ActionToolbar flag={flag} onAfterAction={onAfterAction} />
        </section>

        {/* Plan context */}
        <section className="border-border rounded-lg border p-4">
          <h4 className="text-label text-ink-subtle mb-3 flex items-center gap-1.5 uppercase">
            <Stethoscope className="size-3.5" /> Plan context
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Medication">
              <span className="font-medium">{DRUG_LABELS[ctx.drug]}</span> · {ctx.dose}
            </Field>
            <Field label="On therapy">
              {ctx.weeksOnTherapy != null ? `Week ${ctx.weeksOnTherapy}` : "—"}
            </Field>
            <Field label="Target">
              <span className="inline-flex items-center gap-1">
                <Target className="size-3.5 text-primary" />
                {ctx.target === "remission" ? "Remission" : "Low disease activity"}
              </span>
            </Field>
            <Field label="Next labs">
              <span className="inline-flex items-center gap-1">
                <FlaskConical className="size-3.5 text-ink-muted" />
                {ctx.nextLabDueDate ? formatDate(ctx.nextLabDueDate) : "—"}
              </span>
            </Field>
          </div>

          <div className="border-border mt-4 flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-label text-ink-subtle uppercase">Latest RAPID3</p>
              {measures.length ? (
                <Rapid3Pill
                  value={measures.at(-1)!.value}
                  bucket={measures.at(-1)!.bucket}
                  className="mt-0.5"
                />
              ) : (
                <p className="text-ink-subtle text-sm">No check-ins</p>
              )}
            </div>
            <ScoreTrend measures={measures} />
          </div>
        </section>
      </div>
    </div>
  );
}
