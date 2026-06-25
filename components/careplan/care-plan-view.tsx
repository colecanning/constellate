"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useConstellateStore } from "@/lib/store/useConstellateStore";
import { PlanEditor } from "@/components/careplan/plan-editor";
import { ThresholdEditor } from "@/components/careplan/threshold-editor";
import { DRUG_LABELS } from "@/lib/labels";

export function CarePlanView({ patientId }: { patientId: string }) {
  const patient = useConstellateStore((s) => s.patients.find((p) => p.id === patientId));
  const carePlan = useConstellateStore((s) =>
    s.carePlans.find((c) => c.id === patient?.carePlanId),
  );
  const protocol = useConstellateStore((s) =>
    s.protocols.find((p) => p.id === carePlan?.protocolId),
  );

  if (!patient || !carePlan || !protocol) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-10">
        <p className="text-ink-muted">Care plan not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <Link
        href={`/console/patients/${patient.id}`}
        className="text-ink-muted hover:text-ink mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> {patient.name}
      </Link>

      <header className="mb-6">
        <h1 className="text-display text-ink text-2xl">Care plan</h1>
        <p className="text-ink-muted text-sm">
          {patient.name} · instance of the{" "}
          <span className="text-ink">{protocol.name}</span> protocol ·{" "}
          {DRUG_LABELS[carePlan.currentRung.drug]}
        </p>
      </header>

      <div className="space-y-5">
        <PlanEditor carePlan={carePlan} />
        <ThresholdEditor carePlan={carePlan} protocol={protocol} />
      </div>
    </div>
  );
}
