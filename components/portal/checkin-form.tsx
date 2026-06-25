"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConstellateStore } from "@/lib/store/useConstellateStore";
import { SYMPTOM_LABELS } from "@/lib/labels";
import type { SymptomKey } from "@/lib/types";

/** The 10 MDHAQ function (ADL) items — each scored 0 (no difficulty) to 3 (unable). */
const FUNCTION_ITEMS = [
  "Dress yourself, including buttons and laces",
  "Get in and out of bed",
  "Lift a full cup or glass to your mouth",
  "Walk outdoors on flat ground",
  "Wash and dry your entire body",
  "Bend down to pick up clothing from the floor",
  "Turn regular faucets on and off",
  "Get in and out of a car",
  "Walk two miles",
  "Take part in recreation and sports as you'd like",
];

const FUNCTION_OPTIONS = ["None", "Some", "Much", "Unable"];

const SYMPTOM_OPTIONS: SymptomKey[] = [
  "joint_swelling",
  "morning_stiffness",
  "fatigue",
  "fever",
  "chills",
  "sore_throat",
  "cough",
  "mouth_sores",
  "nausea",
  "hair_loss",
  "rash",
];

function Segmented({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1" role="radiogroup">
      {FUNCTION_OPTIONS.map((opt, i) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === i}
          onClick={() => onChange(i)}
          className={cn(
            "min-h-[44px] min-w-[44px] flex-1 rounded-md border px-2 py-2.5 text-xs transition-colors",
            value === i
              ? "border-primary bg-primary text-on-primary"
              : "border-border text-ink-muted hover:bg-surface-1",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function CheckInForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const patient = useConstellateStore((s) => s.patients.find((p) => p.id === patientId));
  const submitCheckIn = useConstellateStore((s) => s.submitCheckIn);

  const [functionItems, setFunctionItems] = useState<number[]>(Array(10).fill(0));
  const [pain, setPain] = useState(0);
  const [globalHealth, setGlobalHealth] = useState(0);
  const [symptoms, setSymptoms] = useState<Set<SymptomKey>>(new Set());
  const [temperatureF, setTemperatureF] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!patient) {
    return <div className="mx-auto max-w-xl px-5 py-12 text-ink-muted">Portal not found.</div>;
  }

  const firstName = patient.name.split(" ")[0];

  function setItem(idx: number, v: number) {
    setFunctionItems((items) => items.map((x, i) => (i === idx ? v : x)));
  }
  function toggleSymptom(s: SymptomKey) {
    setSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function submit() {
    setSubmitting(true);
    submitCheckIn(
      patientId,
      {
        rapid3: { functionItems, pain, globalHealth },
        symptoms: {
          symptoms: [...symptoms],
          temperatureF: temperatureF ? Number(temperatureF) : undefined,
        },
      },
      "portal",
    );
    toast.success(`Thanks, ${firstName} — your check-in is on its way to your care team.`);
    router.push(`/portal/${patientId}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={`/portal/${patientId}`}
        className="text-ink-muted hover:text-ink mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>

      <h1 className="text-display text-ink text-2xl">Check-in</h1>
      <p className="text-ink-muted mt-1">
        A few quick questions about the past week. There are no right or wrong answers —
        just tell us how things have been.
      </p>

      {/* Function */}
      <section className="mt-7">
        <h2 className="text-ink font-medium">
          Over the past week, were you able to…
        </h2>
        <p className="text-ink-subtle text-sm">How much difficulty, if any?</p>
        <ul className="mt-3 space-y-3">
          {FUNCTION_ITEMS.map((item, i) => (
            <li key={i} className="grid gap-1.5 sm:grid-cols-2 sm:items-center sm:gap-3">
              <span className="text-ink text-sm">{item}</span>
              <Segmented value={functionItems[i]} onChange={(v) => setItem(i, v)} />
            </li>
          ))}
        </ul>
      </section>

      {/* Pain */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <Label className="min-w-0">How much pain have you had in the past week?</Label>
          <span className="font-numeric text-ink shrink-0 tabular-nums">{pain} / 10</span>
        </div>
        <Slider
          className="mt-3"
          value={[pain]}
          min={0}
          max={10}
          step={1}
          onValueChange={(v) => setPain(v[0])}
        />
        <div className="text-ink-subtle mt-1 flex justify-between text-xs">
          <span>No pain</span>
          <span>Pain as bad as it could be</span>
        </div>
      </section>

      {/* Global */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <Label className="min-w-0">Considering all the ways your arthritis affects you, how are you?</Label>
          <span className="font-numeric text-ink shrink-0 tabular-nums">{globalHealth} / 10</span>
        </div>
        <Slider
          className="mt-3"
          value={[globalHealth]}
          min={0}
          max={10}
          step={1}
          onValueChange={(v) => setGlobalHealth(v[0])}
        />
        <div className="text-ink-subtle mt-1 flex justify-between text-xs">
          <span>Very well</span>
          <span>Very poorly</span>
        </div>
      </section>

      {/* Symptoms */}
      <section className="mt-8">
        <Label>Any of these in the past week? (optional)</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((s) => {
            const on = symptoms.has(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSymptom(s)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  on
                    ? "border-primary bg-primary-light text-primary-hover"
                    : "border-border text-ink-muted hover:bg-surface-1",
                )}
              >
                {SYMPTOM_LABELS[s]}
              </button>
            );
          })}
        </div>

        {symptoms.has("fever") && (
          <div className="mt-4 max-w-xs space-y-1.5">
            <Label htmlFor="temp">Temperature (°F), if you know it</Label>
            <Input
              id="temp"
              inputMode="decimal"
              placeholder="e.g. 100.6"
              value={temperatureF}
              onChange={(e) => setTemperatureF(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ink-subtle text-xs">
          Your answers go to your care team. This isn&apos;t a way to reach someone urgently —
          for emergencies, call your doctor or 911.
        </p>
        <Button
          size="lg"
          onClick={submit}
          disabled={submitting}
          className="w-full shrink-0 sm:w-auto"
        >
          Submit check-in
        </Button>
      </div>
    </div>
  );
}
