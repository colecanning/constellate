"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConstellateStore } from "@/lib/store/useConstellateStore";
import { nextLabDue } from "@/lib/clinical/labSchedule";
import { DRUG_LABELS } from "@/lib/labels";
import type { CarePlan, DrugName, TargetState } from "@/lib/types";

const DRUGS: DrugName[] = [
  "methotrexate",
  "hydroxychloroquine",
  "sulfasalazine",
  "leflunomide",
  "adalimumab",
  "etanercept",
];

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-ink-subtle text-xs">{hint}</p>}
    </div>
  );
}

export function PlanEditor({ carePlan }: { carePlan: CarePlan }) {
  const updateCarePlan = useConstellateStore((s) => s.updateCarePlan);

  const [form, setForm] = useState({
    target: carePlan.target,
    drug: carePlan.currentRung.drug,
    dose: carePlan.currentRung.dose,
    startDate: carePlan.currentRung.startDate,
    lastDoseChangeDate: carePlan.currentRung.lastDoseChangeDate ?? "",
    cadenceDays: String(carePlan.cadenceDays),
    nextLabDueDate: carePlan.nextLabDueDate ?? "",
    nextVisitDate: carePlan.nextVisitDate ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function recomputeLabs() {
    const due = nextLabDue({
      drug: form.drug,
      startDate: form.startDate,
      lastDoseChangeDate: form.lastDoseChangeDate || null,
      lastLabDate: carePlan.lastLabDate,
    });
    set("nextLabDueDate", due ?? "");
    toast.message(
      due
        ? `Next labs computed: ${due}`
        : "No routine lab schedule for this drug",
    );
  }

  function save() {
    updateCarePlan(carePlan.id, {
      target: form.target as TargetState,
      cadenceDays: Number(form.cadenceDays) || carePlan.cadenceDays,
      nextLabDueDate: form.nextLabDueDate || null,
      nextVisitDate: form.nextVisitDate || null,
      currentRung: {
        drug: form.drug,
        dose: form.dose,
        startDate: form.startDate,
        lastDoseChangeDate: form.lastDoseChangeDate || null,
      },
    });
    toast.success("Care plan saved");
  }

  return (
    <section className="border-border rounded-lg border bg-canvas p-5 shadow-card">
      <h2 className="text-ink mb-1 font-medium">Plan</h2>
      <p className="text-ink-muted mb-4 text-sm">
        Target, the current rung on the medication ladder, and the monitoring cadence it
        requires.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target" htmlFor="target">
          <Select value={form.target} onValueChange={(v) => set("target", v as TargetState)}>
            <SelectTrigger id="target">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remission">Remission</SelectItem>
              <SelectItem value="low">Low disease activity</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Check-in cadence (days)" htmlFor="cadence">
          <Input
            id="cadence"
            inputMode="numeric"
            value={form.cadenceDays}
            onChange={(e) => set("cadenceDays", e.target.value.replace(/[^0-9]/g, ""))}
          />
        </Field>

        <Field label="Medication" htmlFor="drug">
          <Select value={form.drug} onValueChange={(v) => set("drug", v as DrugName)}>
            <SelectTrigger id="drug">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRUGS.map((d) => (
                <SelectItem key={d} value={d}>
                  {DRUG_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Dose" htmlFor="dose">
          <Input
            id="dose"
            value={form.dose}
            onChange={(e) => set("dose", e.target.value)}
            placeholder="e.g. 15 mg weekly"
          />
        </Field>

        <Field label="Start date" htmlFor="start">
          <Input
            id="start"
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </Field>

        <Field
          label="Last dose change"
          htmlFor="dosechange"
          hint="Tightens lab monitoring for ~6 weeks."
        >
          <Input
            id="dosechange"
            type="date"
            value={form.lastDoseChangeDate}
            onChange={(e) => set("lastDoseChangeDate", e.target.value)}
          />
        </Field>

        <Field label="Next labs due" htmlFor="nextlab">
          <div className="flex gap-2">
            <Input
              id="nextlab"
              type="date"
              value={form.nextLabDueDate}
              onChange={(e) => set("nextLabDueDate", e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={recomputeLabs}
              aria-label="Recompute next labs"
              title="Recompute from drug + dates"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </Field>

        <Field label="Next visit" htmlFor="nextvisit">
          <Input
            id="nextvisit"
            type="date"
            value={form.nextVisitDate}
            onChange={(e) => set("nextVisitDate", e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={save} className="gap-1.5">
          <Save className="size-4" /> Save plan
        </Button>
      </div>
    </section>
  );
}
