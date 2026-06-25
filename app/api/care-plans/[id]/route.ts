import type { NextRequest } from "next/server";
import { buildSeed } from "@/lib/mock/seed";
import { patientStatus } from "@/lib/store/selectors";
import { mockJson } from "@/app/api/_mock";

// GET /api/care-plans/[id] → a Care Plan + its patient's derived Patient Status.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const seed = buildSeed();
  const carePlan = seed.carePlans.find((c) => c.id === id);
  if (!carePlan) {
    return mockJson({ error: `Care plan ${id} not found` }, { status: 404 });
  }
  const patient = seed.patients.find((p) => p.id === carePlan.patientId);
  return mockJson({
    carePlan,
    patient,
    status: patientStatus(seed.checkIns, carePlan),
  });
}
