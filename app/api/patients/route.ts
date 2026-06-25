import { buildSeed } from "@/lib/mock/seed";
import { patientStatus } from "@/lib/store/selectors";
import { mockJson } from "@/app/api/_mock";

// GET /api/patients → enrolled patients with their derived Patient Status + open flag count.
export async function GET() {
  const seed = buildSeed();
  const patients = seed.patients.map((patient) => {
    const carePlan = seed.carePlans.find((c) => c.id === patient.carePlanId)!;
    return {
      ...patient,
      carePlan,
      status: patientStatus(seed.checkIns, carePlan),
      openFlags: seed.flags.filter(
        (f) => f.patientId === patient.id && f.status === "open",
      ).length,
    };
  });
  return mockJson({ patients, count: patients.length });
}
