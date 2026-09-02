import { HostDashboard } from "./HostDashboard";

export default async function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <HostDashboard code={code.toUpperCase()} />;
}
