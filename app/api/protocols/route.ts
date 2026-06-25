import { buildSeed } from "@/lib/mock/seed";
import { mockJson } from "@/app/api/_mock";

// GET /api/protocols → the Protocol templates.
export async function GET() {
  const { protocols } = buildSeed();
  return mockJson({ protocols });
}
