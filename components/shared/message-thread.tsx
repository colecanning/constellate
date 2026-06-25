"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/dates";
import type { Message } from "@/lib/types";

/**
 * Patient ↔ practice thread. DESIGN: provider (outbound) bubbles anchor left on surface-1;
 * patient (inbound) bubbles anchor right in teal. One component for both Channels and both
 * the console and the portal (SMS + portal feed the same Message records).
 */
export function MessageThread({
  messages,
  onSend,
  placeholder = "Write a message…",
}: {
  messages: Message[];
  onSend?: (body: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    const body = draft.trim();
    if (!body || !onSend) return;
    onSend(body);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        {messages.length === 0 && (
          <p className="text-ink-subtle py-4 text-center text-sm">No messages yet.</p>
        )}
        {messages.map((m) => {
          const inbound = m.direction === "inbound";
          return (
            <div
              key={m.id}
              className={cn("flex flex-col gap-0.5", inbound ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  inbound
                    ? "bg-primary text-on-primary"
                    : "bg-surface-1 text-ink border-border border",
                )}
              >
                {m.body}
              </div>
              <span className="text-ink-subtle text-[11px]">
                {inbound ? "Patient" : "Care team"} · {m.channel.toUpperCase()} ·{" "}
                {formatDate(m.createdAt.slice(0, 10))}
              </span>
            </div>
          );
        })}
      </div>

      {onSend && (
        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            className="resize-none"
          />
          <Button size="icon" onClick={submit} disabled={!draft.trim()} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
