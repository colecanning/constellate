"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useConstellateStore } from "@/lib/store/useConstellateStore";
import { SYMPTOM_LABELS, TRIGGER_TYPE_LABELS } from "@/lib/labels";
import type { CarePlan, Protocol, TriggerConfig, TriggerDef } from "@/lib/types";

/** Resolve a trigger's effective config + enabled state on this Care Plan. */
function resolve(trigger: TriggerDef, carePlan: CarePlan) {
  const ov = carePlan.thresholds[trigger.id];
  return {
    config: { ...trigger.config, ...(ov ?? {}) } as TriggerConfig,
    enabled: ov?.enabled ?? trigger.enabled,
  };
}

function NumberRow({
  id,
  label,
  value,
  suffix,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number | undefined;
  suffix?: string;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-ink-muted font-normal">
        {label}
      </Label>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          inputMode="numeric"
          disabled={disabled}
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9]/g, "")))}
          className="w-20 text-right"
        />
        {suffix && <span className="text-ink-subtle text-xs">{suffix}</span>}
      </div>
    </div>
  );
}

export function ThresholdEditor({
  carePlan,
  protocol,
}: {
  carePlan: CarePlan;
  protocol: Protocol;
}) {
  const editThresholds = useConstellateStore((s) => s.editThresholds);

  return (
    <section className="border-border rounded-lg border bg-canvas p-5 shadow-card">
      <h2 className="text-ink mb-1 font-medium">Triggers &amp; thresholds</h2>
      <p className="text-ink-muted mb-4 text-sm">
        You&apos;re setting the thresholds the system flags against. Changes take effect on
        the next check-in or time sweep — the system executes your rules, it doesn&apos;t
        generate clinical judgment.
      </p>

      <ul className="divide-border divide-y">
        {protocol.triggers.map((trigger) => {
          const { config, enabled } = resolve(trigger, carePlan);
          return (
            <li key={trigger.id} className="py-4 first:pt-0 last:pb-0">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink font-medium">{trigger.label}</span>
                    <span className="text-ink-subtle text-label uppercase">
                      {TRIGGER_TYPE_LABELS[trigger.type]}
                    </span>
                  </div>
                  <p className="text-ink-muted mt-0.5 max-w-prose text-sm">
                    {trigger.description}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) =>
                    editThresholds(carePlan.id, trigger.id, { enabled: v })
                  }
                  aria-label={`${trigger.label} enabled`}
                />
              </div>

              <div
                className={`space-y-2 ${enabled ? "" : "pointer-events-none opacity-50"}`}
              >
                {trigger.type === "rapid3_threshold" && (
                  <NumberRow
                    id={`${trigger.id}-thr`}
                    label="Flag when RAPID3 is above"
                    suffix="/ 30"
                    value={config.rapid3Threshold}
                    onChange={(n) =>
                      editThresholds(carePlan.id, trigger.id, { rapid3Threshold: n })
                    }
                  />
                )}

                {trigger.type === "rapid3_rise" && (
                  <NumberRow
                    id={`${trigger.id}-rise`}
                    label="Flag when the bucket rises by at least"
                    suffix="band(s)"
                    value={config.riseBuckets}
                    onChange={(n) =>
                      editThresholds(carePlan.id, trigger.id, {
                        riseBuckets: Math.max(1, n),
                      })
                    }
                  />
                )}

                {trigger.type === "lab_due" && (
                  <NumberRow
                    id={`${trigger.id}-win`}
                    label="Surface labs due within"
                    suffix="days"
                    value={config.labWindowDays}
                    onChange={(n) =>
                      editThresholds(carePlan.id, trigger.id, { labWindowDays: n })
                    }
                  />
                )}

                {trigger.type === "reengagement" && (
                  <NumberRow
                    id={`${trigger.id}-sil`}
                    label="Flag after silence past cadence +"
                    suffix="days"
                    value={config.silenceDays}
                    onChange={(n) =>
                      editThresholds(carePlan.id, trigger.id, { silenceDays: n })
                    }
                  />
                )}

                {trigger.type === "red_flag_symptom" && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-ink-muted text-sm">Watched symptoms:</span>
                    {(config.symptoms ?? []).map((s) => (
                      <span
                        key={s}
                        className="bg-urgent-bg text-urgent text-label rounded-full px-2 py-0.5"
                      >
                        {SYMPTOM_LABELS[s]}
                      </span>
                    ))}
                    <span className="text-ink-subtle text-xs">
                      · only while on an immunosuppressant
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
