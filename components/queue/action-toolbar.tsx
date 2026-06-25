"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  MessageSquare,
  Phone,
  FlaskConical,
  Pill,
  ClipboardEdit,
  CalendarPlus,
  NotebookPen,
  X,
  Clock,
  UserPlus,
  Check,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useConstellateStore } from "@/lib/store/useConstellateStore";
import { ACTION_LABELS } from "@/lib/labels";
import type { ActionType, Flag } from "@/lib/types";

type InputKind = "message" | "note" | "snooze" | null;

interface Tool {
  type: ActionType;
  icon: LucideIcon;
  group: "Clinical" | "Plan & visit" | "Queue";
  input: InputKind;
}

const TOOLS: Tool[] = [
  { type: "message_patient", icon: MessageSquare, group: "Clinical", input: "message" },
  { type: "schedule_call", icon: Phone, group: "Clinical", input: null },
  { type: "order_labs", icon: FlaskConical, group: "Clinical", input: null },
  { type: "adjust_medication", icon: Pill, group: "Clinical", input: null },
  { type: "adjust_care_plan", icon: ClipboardEdit, group: "Plan & visit", input: null },
  { type: "request_visit", icon: CalendarPlus, group: "Plan & visit", input: null },
  { type: "add_chart_note", icon: NotebookPen, group: "Queue", input: "note" },
  { type: "snooze", icon: Clock, group: "Queue", input: "snooze" },
  { type: "escalate", icon: UserPlus, group: "Queue", input: null },
  { type: "dismiss", icon: X, group: "Queue", input: null },
];

const GROUPS: Tool["group"][] = ["Clinical", "Plan & visit", "Queue"];

export function ActionToolbar({
  flag,
  onAfterAction,
}: {
  flag: Flag;
  onAfterAction?: () => void;
}) {
  const takeAction = useConstellateStore((s) => s.takeAction);
  const [dialog, setDialog] = useState<{ type: ActionType; input: InputKind } | null>(
    null,
  );
  const [text, setText] = useState("");

  const suggested = flag.suggestedAction;

  function apply(type: ActionType, opts?: { note?: string; snoozeDays?: number }) {
    takeAction(flag.id, type, opts);
    toast.success(`${ACTION_LABELS[type]} — recorded`, {
      description:
        type === "snooze"
          ? "Flag deferred and removed from the queue."
          : type === "dismiss"
            ? "Flag dismissed with a disposition for the record."
            : "Disposition recorded; flag cleared from the queue.",
    });
    onAfterAction?.();
  }

  function onToolClick(tool: Tool) {
    if (tool.input) {
      setText(tool.input === "snooze" ? "3" : "");
      setDialog({ type: tool.type, input: tool.input });
    } else {
      apply(tool.type);
    }
  }

  function approveSuggested() {
    apply(suggested.type, { note: suggested.detail });
  }

  return (
    <div className="space-y-4">
      {/* Suggested action — the one spot to approve the engine's recommendation */}
      <div className="border-primary/30 bg-primary-light/40 rounded-lg border p-4">
        <p className="text-label text-primary-hover mb-1 uppercase">
          Suggested · {ACTION_LABELS[suggested.type]}
        </p>
        <p className="text-ink font-medium">{suggested.label}</p>
        {suggested.detail && (
          <p className="text-ink-muted mt-1 text-sm">{suggested.detail}</p>
        )}
        <Button
          onClick={approveSuggested}
          size="lg"
          className="mt-3 w-full justify-center gap-2"
        >
          <Check className="size-4" />
          Approve
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-label text-ink-subtle uppercase">Or take another action</p>
        {GROUPS.map((group) => (
          <div key={group}>
            <p className="text-label text-ink-subtle mb-1.5 uppercase">{group}</p>
            <div className="flex flex-wrap gap-2">
              {TOOLS.filter((t) => t.group === group).map((tool) => {
                const Icon = tool.icon;
                return (
                  <Button
                    key={tool.type}
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onToolClick(tool)}
                  >
                    <Icon className="size-3.5" />
                    {ACTION_LABELS[tool.type]}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          {dialog && (
            <>
              <DialogHeader>
                <DialogTitle>{ACTION_LABELS[dialog.type]}</DialogTitle>
                <DialogDescription>
                  {dialog.input === "snooze"
                    ? "Defer this flag — it returns to the queue when the snooze elapses."
                    : dialog.input === "message"
                      ? "Compose a message to the patient. Sent on their preferred channel."
                      : "Add a note to the chart and resolve this flag."}
                </DialogDescription>
              </DialogHeader>

              {dialog.input === "snooze" ? (
                <div className="space-y-2">
                  <Label htmlFor="snooze-days">Snooze for (days)</Label>
                  <Textarea
                    id="snooze-days"
                    rows={1}
                    value={text}
                    onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="action-text">
                    {dialog.input === "message" ? "Message" : "Chart note"}
                  </Label>
                  <Textarea
                    id="action-text"
                    rows={4}
                    placeholder={
                      dialog.input === "message"
                        ? "e.g. Please hold tonight's dose; the nurse will call you shortly."
                        : "e.g. Reviewed trend; labs ordered, nurse to assess fever."
                    }
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
              )}

              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (dialog.input === "snooze") {
                      apply("snooze", { snoozeDays: Number(text) || 3 });
                    } else {
                      apply(dialog.type, { note: text || undefined });
                    }
                    setDialog(null);
                  }}
                >
                  {dialog.input === "snooze" ? "Snooze" : "Confirm"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
