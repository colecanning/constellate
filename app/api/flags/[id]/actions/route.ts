import type { NextRequest } from "next/server";
import type { Action, ActionType, Disposition, FlagStatus } from "@/lib/types";
import { buildSeed } from "@/lib/mock/seed";
import { ACTION_LABELS } from "@/lib/labels";
import { mockJson } from "@/app/api/_mock";

interface ActionBody {
  type: ActionType;
  note?: string;
  reason?: string;
}

const closingStatus = (type: ActionType): FlagStatus =>
  type === "snooze" ? "snoozed" : type === "dismiss" ? "dismissed" : "resolved";

// POST /api/flags/[id]/actions → record an Action + Disposition on a Flag.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as ActionBody;
  const seed = buildSeed();

  const flag = seed.flags.find((f) => f.id === id);
  if (!flag) {
    return mockJson({ error: `Flag ${id} not found` }, { status: 404 });
  }

  const at = `${seed.asOf}T20:05:00.000Z`;
  const action: Action = {
    id: "act-api",
    flagId: id,
    type: body.type,
    note: body.note,
    takenBy: seed.provider.name,
    takenAt: at,
  };

  const status = closingStatus(body.type);
  const disposition: Disposition | undefined =
    body.type === "snooze"
      ? undefined
      : {
          id: "disp-api",
          flagId: id,
          actionType: body.type,
          reason: body.reason ?? `${ACTION_LABELS[body.type]} — actioned from the queue.`,
          resolvedBy: seed.provider.name,
          resolvedAt: at,
        };

  return mockJson({
    action,
    disposition,
    flag: { ...flag, status, disposition },
  });
}
