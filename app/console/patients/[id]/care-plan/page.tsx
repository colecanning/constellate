import { CarePlanView } from "@/components/careplan/care-plan-view";

export default async function CarePlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CarePlanView patientId={id} />;
}
