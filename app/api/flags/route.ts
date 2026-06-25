import { buildSeed } from "@/lib/mock/seed";
import { actionQueue } from "@/lib/store/selectors";
import { mockJson } from "@/app/api/_mock";

// GET /api/flags → the Action Queue (open flags, severity-ordered).
export async function GET() {
  const { flags } = buildSeed();
  const queue = actionQueue(flags);
  return mockJson({ flags: queue, count: queue.length });
}
