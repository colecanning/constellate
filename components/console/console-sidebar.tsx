"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Inbox, Users, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConstellateStore } from "@/lib/store/useConstellateStore";
import { TONE_STYLES, type Tone } from "@/lib/ui";
import type { Severity } from "@/lib/types";

const NAV = [
  { href: "/console", label: "Action Queue", icon: Inbox, exact: true },
  { href: "/console/patients", label: "Patients", icon: Users, exact: false },
  { href: "/console/protocol", label: "Protocol", icon: ClipboardList, exact: false },
];

const STAT_ROWS: { severity: Severity; tone: Tone; label: string }[] = [
  { severity: "urgent", tone: "urgent", label: "Urgent" },
  { severity: "warning", tone: "warning", label: "Warning" },
  { severity: "stable", tone: "normal", label: "Stable" },
];

export function ConsoleSidebar() {
  const pathname = usePathname();
  const flags = useConstellateStore((s) => s.flags);
  const patients = useConstellateStore((s) => s.patients);
  const provider = useConstellateStore((s) => s.provider);

  const counts = useMemo(() => {
    const open = flags.filter((f) => f.status === "open");
    return {
      total: open.length,
      urgent: open.filter((f) => f.severity === "urgent").length,
      warning: open.filter((f) => f.severity === "warning").length,
      stable: open.filter((f) => f.severity === "stable").length,
    };
  }, [flags]);

  return (
    <aside className="bg-surface-1 border-border sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 flex-col border-r md:flex">
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary-light text-primary-hover font-medium"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="size-4" />
              {item.label}
              {item.href === "/console" && counts.total > 0 && (
                <span className="text-label bg-ink/8 text-ink-muted ml-auto rounded-full px-1.5 py-0.5 tabular-nums">
                  {counts.total}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mt-2 rounded-lg border border-border bg-canvas p-3 shadow-card">
        <p className="text-label text-ink-subtle mb-2 uppercase">Queue at a glance</p>
        <ul className="flex flex-col gap-1.5">
          {STAT_ROWS.map((row) => (
            <li key={row.severity} className="flex items-center gap-2 text-sm">
              <span className={cn("size-2 rounded-full", TONE_STYLES[row.tone].dot)} />
              <span className="text-ink-muted">{row.label}</span>
              <span className="text-ink ml-auto font-numeric tabular-nums">
                {counts[row.severity]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto p-3">
        <div className="border-border flex items-center gap-2.5 rounded-lg border bg-canvas p-2.5">
          <span className="bg-primary text-on-primary flex size-8 items-center justify-center rounded-full text-sm font-medium">
            {provider.name.split(" ").map((w) => w[0]).slice(-2).join("")}
          </span>
          <div className="min-w-0">
            <p className="text-ink truncate text-sm font-medium">{provider.name}</p>
            <p className="text-ink-subtle truncate text-xs">{provider.role}</p>
          </div>
        </div>
        <p className="text-ink-subtle mt-2 px-1 text-[11px]">
          {patients.length} patients enrolled
        </p>
      </div>
    </aside>
  );
}
