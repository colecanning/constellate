"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  ChevronDown,
  ArrowLeft,
  User,
  Clock,
  RotateCcw,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConstellateStore } from "@/lib/store/useConstellateStore";
import { addDays } from "@/lib/dates";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Global top bar (DESIGN: 56px fixed header) + persona switcher.
 * Provider Console ⇄ a patient's Portal — no auth, just a view switch for the demo.
 */
export function TopBar() {
  const pathname = usePathname();
  const patients = useConstellateStore((s) => s.patients);

  const asOf = useConstellateStore((s) => s.asOf);
  const simulateHeroFlare = useConstellateStore((s) => s.simulateHeroFlare);
  const runTimeSweep = useConstellateStore((s) => s.runTimeSweep);
  const resetToSeed = useConstellateStore((s) => s.resetToSeed);

  const portalMatch = pathname.match(/^\/portal\/([^/]+)/);
  const portalPatient = portalMatch
    ? patients.find((p) => p.id === portalMatch[1])
    : undefined;
  const inPortal = Boolean(portalMatch);

  function onFlare() {
    const created = simulateHeroFlare();
    toast.info("Maria Reyes checked in (SMS)", {
      description: `Flare check-in processed — ${created.length} new flag${
        created.length === 1 ? "" : "s"
      } raised against her plan.`,
    });
  }
  function onSweep() {
    const next = addDays(asOf, 7);
    const created = runTimeSweep(next);
    toast.message(`Time advanced to ${next}`, {
      description: created.length
        ? `${created.length} new time-driven flag${created.length === 1 ? "" : "s"} raised.`
        : "No new time-driven flags due.",
    });
  }
  function onReset() {
    resetToSeed();
    toast.message("Demo reset to seed");
  }

  return (
    <header className="bg-canvas border-border sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 sm:px-6">
      <Link href="/console" className="flex items-center gap-2">
        <span className="bg-primary text-on-primary flex size-7 items-center justify-center rounded-md">
          <Sparkles className="size-4" />
        </span>
        <span className="text-display text-[17px] text-ink">Constellate</span>
      </Link>

      {inPortal ? (
        <div className="flex items-center gap-3">
          <span className="text-ink-muted text-label hidden items-center gap-1.5 sm:inline-flex">
            <User className="size-3.5" /> Patient Portal
            {portalPatient ? ` · ${portalPatient.name}` : ""}
          </span>
          <Link
            href="/console"
            className="text-label text-ink-muted hover:bg-surface-1 inline-flex items-center gap-1.5 rounded-md px-3 py-2"
          >
            <ArrowLeft className="size-3.5" /> Provider Console
          </Link>
        </div>
      ) : (
        <nav className="flex items-center gap-1">
          <Link
            href="/console"
            className="text-label bg-primary-light text-primary-hover rounded-md px-3 py-2"
          >
            Provider Console
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "text-label text-ink-muted hover:bg-surface-1 inline-flex items-center gap-1.5 rounded-md px-3 py-2",
                "focus-visible:outline-none",
              )}
            >
              View as patient <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Open a patient portal</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {patients.map((p) => (
                <DropdownMenuItem key={p.id} asChild>
                  <Link href={`/portal/${p.id}`}>{p.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "text-label text-primary-hover hover:bg-primary-light inline-flex items-center gap-1.5 rounded-md px-3 py-2",
                "focus-visible:outline-none",
              )}
            >
              <Activity className="size-3.5" /> Demo
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Scenario controls</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onFlare}>
                <Sparkles className="size-4" /> Simulate Maria&apos;s flare (SMS)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSweep}>
                <Clock className="size-4" /> Run time sweep (+7 days)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onReset}>
                <RotateCcw className="size-4" /> Reset demo to seed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      )}
    </header>
  );
}
