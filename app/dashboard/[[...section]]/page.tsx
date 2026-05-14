import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentAgent } from "@/lib/auth/session";
import { agentBaseUrl } from "@/lib/dashboard/client-utils";
import { getDashboardSummary } from "@/lib/dashboard/data";
import { getDistributionData } from "@/lib/dashboard/distribution";
import { getPublicOriginFromHeaders } from "@/lib/public-origin";
import { qrDataUrl } from "@/lib/qr";

const allowed = new Set(["leads", "listings", "distribution", "settings"]);

export default async function DashboardPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const agent = await getCurrentAgent();
  if (!agent) redirect("/signup");
  const { section: parts } = await params;
  const section = parts?.[0] ?? "leads";
  if (!allowed.has(section)) redirect("/dashboard/leads");

  const summary = await getDashboardSummary(agent);
  const origin = await requestOrigin();
  const distribution = await getDistributionData(agent, summary.leads, origin);
  const url = agentBaseUrl(agent, origin);
  const qr = await qrDataUrl(url);

  return (
    <DashboardShell
      initialAgent={summary.agent}
      initialLeads={summary.leads}
      initialListings={summary.listings}
      distribution={distribution}
      qr={qr}
      baseUrl={origin ?? "http://localhost:3000"}
      section={section as never}
    />
  );
}

async function requestOrigin() {
  return getPublicOriginFromHeaders(await headers()) ?? undefined;
}
