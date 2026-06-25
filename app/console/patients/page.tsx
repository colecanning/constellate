"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import {
  useConstellateStore,
  patientStatus,
  patientLatestMeasure,
} from "@/lib/store/useConstellateStore";
import { Rapid3Pill } from "@/components/shared/rapid3-pill";
import { DRUG_LABELS } from "@/lib/labels";
import { relativeToToday } from "@/lib/dates";

export default function PatientsPage() {
  const patients = useConstellateStore((s) => s.patients);
  const carePlans = useConstellateStore((s) => s.carePlans);
  const checkIns = useConstellateStore((s) => s.checkIns);
  const flags = useConstellateStore((s) => s.flags);
  const asOf = useConstellateStore((s) => s.asOf);

  const rows = useMemo(
    () =>
      patients.map((p) => {
        const carePlan = carePlans.find((c) => c.id === p.carePlanId)!;
        const status = patientStatus(checkIns, carePlan);
        const latest = patientLatestMeasure(checkIns, p.id);
        const openFlags = flags.filter(
          (f) => f.patientId === p.id && f.status === "open",
        ).length;
        return { patient: p, carePlan, status, latest, openFlags };
      }),
    [patients, carePlans, checkIns, flags],
  );

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <header className="mb-6">
        <h1 className="text-display text-ink text-2xl">Patients</h1>
        <p className="text-ink-muted text-sm">
          {patients.length} enrolled on the RA-on-methotrexate protocol.
        </p>
      </header>

      <div className="border-border overflow-hidden rounded-lg border bg-canvas shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-label text-ink-subtle border-border border-b uppercase">
              <th scope="col" className="px-4 py-2.5 text-left font-medium">Patient</th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">Medication</th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">Latest RAPID3</th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">Open flags</th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">Last check-in</th>
              <th scope="col" className="px-2 py-2.5" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ patient, carePlan, status, latest, openFlags }) => (
              <tr
                key={patient.id}
                className="border-border hover:bg-surface-1 border-b last:border-b-0"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/console/patients/${patient.id}`}
                    className="text-ink hover:text-primary font-medium"
                  >
                    {patient.name}
                  </Link>
                  <div className="text-ink-subtle text-xs">
                    {patient.age} · {patient.sex} · {patient.conditions.join(", ")}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-ink">{DRUG_LABELS[carePlan.currentRung.drug]}</span>
                  <div className="text-ink-subtle text-xs">{carePlan.currentRung.dose}</div>
                </td>
                <td className="px-4 py-3">
                  {latest ? (
                    <Rapid3Pill value={latest.value} bucket={latest.bucket} size="sm" />
                  ) : (
                    <span className="text-ink-subtle">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {openFlags > 0 ? (
                    <span className="bg-surface-2 text-ink-muted text-label rounded-full px-2 py-0.5 tabular-nums">
                      {openFlags}
                    </span>
                  ) : (
                    <span className="text-normal text-label">Clear</span>
                  )}
                </td>
                <td className="text-ink-muted px-4 py-3">
                  {status.lastCheckinAt
                    ? relativeToToday(status.lastCheckinAt.slice(0, 10), asOf)
                    : "—"}
                </td>
                <td className="px-2 py-3">
                  <Link
                    href={`/console/patients/${patient.id}`}
                    aria-label={`Open ${patient.name}`}
                  >
                    <ChevronRight className="text-ink-subtle size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
