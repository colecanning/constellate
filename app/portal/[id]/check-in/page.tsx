import { CheckInForm } from "@/components/portal/checkin-form";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CheckInForm patientId={id} />;
}
