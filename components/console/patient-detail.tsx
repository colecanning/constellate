"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowLeft,
  ClipboardEdit,
  ExternalLink,
  Phone,
  Target,
  FlaskConical,
  CalendarDays,
} from "lucide-react";
import {
  useConstellateStore,
  patientCheckIns,
  patientMeasures,
  patientThread,
  patientFlags,
} from "@/lib/store/useConstellateStore";
import { Button } from "@/components/ui/button";
import { Rapid3Pill } from "@/components/shared/rapid3-pill";
import { ScoreTrend } from "@/components/shared/score-trend";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { MessageThread } from "@/components/shared/message-thread";
import { flagTone } from "@/lib/ui";
import { DRUG_LABELS, SYMPTOM_LABELS, TRIGGER_TYPE_LABELS } from "@/lib/labels";
import { formatDate, relativeToToday, weeksBetween } from "@/lib/dates";

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border rounded-lg border bg-canvas p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-label text-ink-subtle uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="text-ink-subtle mt-0.5 size-4 shrink-0" />
      <div>
        <p className="text-label text-ink-subtle uppercase">{label}</p>
        <p className="text-ink text-sm">{children}</p>
      </div>
    </div>
  );
}

export function PatientDetail({ patientId }: { patientId: string }) {
  const patient = useConstellateStore((s) => s.patients.find((p) => p.id === patientId));
  const carePlans = useConstellateStore((s) => s.carePlans);
  const checkIns = useConstellateStore((s) => s.checkIns);
  const messages = useConstellateStore((s) => s.messages);
  const flags = useConstellateStore((s) => s.flags);
  const asOf = useConstellateStore((s) => s.asOf);
  const sendMessage = useConstellateStore((s) => s.sendMessage);

  const carePlan = carePlans.find((c) => c.id === patient?.carePlanId);
  const history = useMemo(
    () => patientCheckIns(checkIns, patientId).slice().reverse(),
    [checkIns, patientId],
  );
  const measures = useMemo(
    () => patientMeasures(checkIns, patientId).slice(-8),
    [checkIns, patientId],
  );
  const thread = useMemo(() => patientThread(messages, patientId), [messages, patientId]);
  const openFlags = useMemo(
    () => patientFlags(flags, patientId).filter((f) => f.status === "open"),
    [flags, patientId],
  );

  if (!patient || !carePlan) {
    return (
      <div className="mx-auto max-w-[1000px] px-6 py-10">
        <p className="text-ink-muted">Patient not found.</p>
        <Link href="/console/patients" className="text-primary text-sm">
          Back to patients
        </Link>
      </div>
    );
  }

  const latest = measures.at(-1) ?? null;
  const rung = carePlan.currentRung;

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <Link
        href="/console"
        className="text-ink-muted hover:text-ink mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Action Queue
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-display text-ink text-2xl">{patient.name}</h1>
          <p className="text-ink-muted text-sm">
            {patient.age} · {patient.sex === "F" ? "Female" : "Male"} ·{" "}
            {patient.conditions.join(", ")} · {patient.phone}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/portal/${patient.id}`}>
              <ExternalLink className="size-3.5" /> View as patient
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/console/patients/${patient.id}/care-plan`}>
              <ClipboardEdit className="size-3.5" /> Edit care plan
            </Link>
          </Button>
        </div>
      </div>

      {/* Open flags */}
      {openFlags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {openFlags.map((f) => (
            <Link
              key={f.id}
              href="/console"
              className="border-border hover:bg-surface-1 inline-flex items-center gap-2 rounded-full border bg-canvas py-1 pl-1 pr-3"
            >
              <SeverityBadge tone={flagTone(f)} />
              <span className="text-ink-muted text-sm">
                {TRIGGER_TYPE_LABELS[f.triggerType]}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: status + care plan */}
        <div className="space-y-5">
          <Card title="Patient status">
            {latest ? (
              <>
                <Rapid3Pill value={latest.value} bucket={latest.bucket} size="lg" />
                <div className="mt-3">
                  <ScoreTrend measures={measures} width={240} height={56} />
                </div>
                <p className="text-ink-subtle mt-2 text-xs">
                  Last check-in{" "}
                  {relativeToToday(latest.createdAt.slice(0, 10), asOf)}
                </p>
              </>
            ) : (
              <p className="text-ink-subtle text-sm">No check-ins yet.</p>
            )}
          </Card>

          <Card
            title="Care plan"
            action={
              <Link
                href={`/console/patients/${patient.id}/care-plan`}
                className="text-primary text-xs"
              >
                Edit
              </Link>
            }
          >
            <div className="space-y-3">
              <Stat icon={ClipboardEdit} label="Current rung">
                <span className="font-medium">{DRUG_LABELS[rung.drug]}</span> · {rung.dose}
                <span className="text-ink-subtle">
                  {" "}
                  · week {weeksBetween(rung.startDate, asOf)}
                </span>
              </Stat>
              <Stat icon={Target} label="Target">
                {carePlan.target === "remission" ? "Remission" : "Low disease activity"} ·
                check-ins every {carePlan.cadenceDays}d
              </Stat>
              <Stat icon={FlaskConical} label="Next labs">
                {carePlan.nextLabDueDate ? formatDate(carePlan.nextLabDueDate) : "—"}
              </Stat>
              <Stat icon={CalendarDays} label="Next visit">
                {carePlan.nextVisitDate ? formatDate(carePlan.nextVisitDate) : "—"}
              </Stat>
              <Stat icon={Phone} label="Started">
                {DRUG_LABELS[rung.drug]} on {formatDate(rung.startDate)}
              </Stat>
            </div>
          </Card>
        </div>

        {/* Right: history + thread */}
        <div className="space-y-5 lg:col-span-2">
          <Card title="Check-in history">
            {history.length === 0 ? (
              <p className="text-ink-subtle text-sm">No check-ins yet.</p>
            ) : (
              <ul className="divide-border divide-y">
                {history.map((c) => {
                  const m = c.measures[0];
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-ink text-sm">
                          {formatDate(c.createdAt.slice(0, 10))}
                          <span className="text-ink-subtle">
                            {" "}
                            · {c.channel.toUpperCase()}
                          </span>
                        </p>
                        {c.answers.symptoms.symptoms.length > 0 && (
                          <p className="text-ink-subtle text-xs">
                            {c.answers.symptoms.symptoms
                              .map((s) => SYMPTOM_LABELS[s])
                              .join(", ")}
                            {c.answers.symptoms.temperatureF
                              ? ` · ${c.answers.symptoms.temperatureF}°F`
                              : ""}
                          </p>
                        )}
                      </div>
                      {m && <Rapid3Pill value={m.value} bucket={m.bucket} size="sm" />}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Messages">
            <MessageThread
              messages={thread}
              onSend={(body) => sendMessage(patient.id, body)}
              placeholder="Message the patient…"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
