"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Pill, FlaskConical, CalendarDays, ClipboardCheck } from "lucide-react";
import {
  useConstellateStore,
  patientMeasures,
  patientCheckIns,
  patientThread,
} from "@/lib/store/useConstellateStore";
import { Button } from "@/components/ui/button";
import { ScoreTrend } from "@/components/shared/score-trend";
import { MessageThread } from "@/components/shared/message-thread";
import { DRUG_LABELS } from "@/lib/labels";
import { formatDate, relativeToToday } from "@/lib/dates";

function Tile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="border-border rounded-xl border bg-canvas p-4">
      <Icon className="text-primary mb-2 size-5" />
      <p className="text-label text-ink-subtle uppercase">{label}</p>
      <p className="text-ink mt-0.5">{value}</p>
    </div>
  );
}

export function PortalHome({ patientId }: { patientId: string }) {
  const patient = useConstellateStore((s) => s.patients.find((p) => p.id === patientId));
  const carePlan = useConstellateStore((s) =>
    s.carePlans.find((c) => c.id === patient?.carePlanId),
  );
  const checkIns = useConstellateStore((s) => s.checkIns);
  const messages = useConstellateStore((s) => s.messages);
  const asOf = useConstellateStore((s) => s.asOf);
  const sendMessage = useConstellateStore((s) => s.sendMessage);

  const measures = useMemo(
    () => patientMeasures(checkIns, patientId).slice(-8),
    [checkIns, patientId],
  );
  const history = useMemo(
    () => patientCheckIns(checkIns, patientId).slice().reverse().slice(0, 5),
    [checkIns, patientId],
  );
  const thread = useMemo(() => patientThread(messages, patientId), [messages, patientId]);

  if (!patient || !carePlan) {
    return <div className="mx-auto max-w-xl px-5 py-12 text-ink-muted">Portal not found.</div>;
  }

  const firstName = patient.name.split(" ")[0];
  const lastCheckin = patientCheckIns(checkIns, patientId).at(-1) ?? null;
  const rung = carePlan.currentRung;

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-display text-ink text-2xl">Hi {firstName}</h1>
      <p className="text-ink-muted mt-1">
        Your care team monitors how you&apos;re doing between visits. Keeping your check-ins
        up to date helps them stay on top of your treatment.
      </p>

      {/* Check-in CTA */}
      <div className="border-primary/30 bg-primary-light/50 mt-6 flex flex-col items-start gap-3 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-ink flex items-center gap-2 font-medium">
            <ClipboardCheck className="text-primary size-5" /> Time for a check-in?
          </p>
          <p className="text-ink-muted mt-1 text-sm">
            {lastCheckin
              ? `Last check-in ${relativeToToday(lastCheckin.createdAt.slice(0, 10), asOf)}.`
              : "You haven't checked in yet."}{" "}
            It takes about a minute.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link href={`/portal/${patient.id}/check-in`}>Start check-in</Link>
        </Button>
      </div>

      {/* Plan basics */}
      <h2 className="text-label text-ink-subtle mt-8 mb-3 uppercase">Your plan</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile
          icon={Pill}
          label="Medication"
          value={`${DRUG_LABELS[rung.drug]} · ${rung.dose}`}
        />
        <Tile
          icon={FlaskConical}
          label="Next labs"
          value={carePlan.nextLabDueDate ? formatDate(carePlan.nextLabDueDate) : "—"}
        />
        <Tile
          icon={CalendarDays}
          label="Next visit"
          value={carePlan.nextVisitDate ? formatDate(carePlan.nextVisitDate) : "—"}
        />
      </div>

      {/* Check-in history */}
      <h2 className="text-label text-ink-subtle mt-8 mb-3 uppercase">Your check-ins</h2>
      <div className="border-border rounded-xl border bg-canvas p-5">
        {measures.length === 0 ? (
          <p className="text-ink-muted text-sm">No check-ins yet.</p>
        ) : (
          <>
            <ScoreTrend measures={measures} width={560} height={64} monochrome />
            <ul className="divide-border mt-3 divide-y">
              {history.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-ink-muted">
                    {formatDate(c.createdAt.slice(0, 10))}
                    <span className="text-ink-subtle"> · {c.channel.toUpperCase()}</span>
                  </span>
                  <span className="font-numeric text-ink tabular-nums">
                    {c.measures[0]?.value ?? "—"}
                    <span className="text-ink-subtle"> / 30</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Messages */}
      <h2 className="text-label text-ink-subtle mt-8 mb-3 uppercase">
        Messages with your care team
      </h2>
      <div className="border-border rounded-xl border bg-canvas p-5">
        <MessageThread
          messages={thread}
          onSend={(body) => sendMessage(patient.id, body, "portal", "patient")}
          placeholder="Write to your care team…"
        />
      </div>
    </div>
  );
}
