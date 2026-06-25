import { PortalHome } from "@/components/portal/portal-home";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PortalHome patientId={id} />;
}
