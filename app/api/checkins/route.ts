import type { NextRequest } from "next/server";
import type { CheckIn, CheckInAnswers, Channel, Measure } from "@/lib/types";
import { buildSeed } from "@/lib/mock/seed";
import { computeRapid3 } from "@/lib/clinical/rapid3";
import { evaluateCheckin } from "@/lib/engine/evaluateCheckin";
import { evaluateTime } from "@/lib/engine/evaluateTime";
import { dedupeDrafts, flagFromDraft } from "@/lib/flags";
import { patientLatestMeasure } from "@/lib/store/selectors";
import { mockJson } from "@/app/api/_mock";

interface CheckinBody {
  patientId: string;
  answers: CheckInAnswers;
  channel?: Channel;
}

// POST /api/checkins → compute RAPID3 + run the engine; return the Measure + raised Flags.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as CheckinBody;
  const seed = buildSeed();

  const patient = seed.patients.find((p) => p.id === body.patientId);
  const carePlan = seed.carePlans.find((c) => c.id === patient?.carePlanId);
  const protocol = seed.protocols.find((p) => p.id === carePlan?.protocolId);
  if (!patient || !carePlan || !protocol) {
    return mockJson({ error: "Unknown patient or care plan" }, { status: 404 });
  }

  const createdAt = `${seed.asOf}T20:00:00.000Z`;
  const r = computeRapid3(body.answers.rapid3);
  const measure: Measure = {
    id: "m-api",
    checkInId: "ci-api",
    type: "RAPID3",
    value: r.value,
    components: r.components,
    bucket: r.bucket,
    createdAt,
  };
  const checkIn: CheckIn = {
    id: "ci-api",
    patientId: patient.id,
    carePlanId: carePlan.id,
    channel: body.channel ?? "portal",
    createdAt,
    answers: body.answers,
    measures: [measure],
    status: "processed",
  };

  const drafts = [
    ...evaluateCheckin({
      checkIn,
      measure,
      previousMeasure: patientLatestMeasure(seed.checkIns, patient.id),
      carePlan,
      protocol,
      patient,
    }),
    ...evaluateTime({
      carePlan,
      protocol,
      patient,
      asOf: seed.asOf,
      lastCheckinAt: createdAt,
      latestBucket: measure.bucket,
    }),
  ];

  const raisedFlags = dedupeDrafts(seed.flags, drafts).map((d, i) =>
    flagFromDraft(d, `flag-api-${i}`, createdAt, "open"),
  );

  return mockJson({ checkIn, measure, raisedFlags }, { status: 201 });
}
