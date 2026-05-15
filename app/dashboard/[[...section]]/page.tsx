import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { dashboardReturnPath } from "@/lib/auth/destinations";
import { getAuthenticatedAgent } from "@/lib/auth/session";
import { agentBaseUrl } from "@/lib/dashboard/client-utils";
import { getDashboardSummary } from "@/lib/dashboard/data";
import { getDistributionData, sourceBreakdown } from "@/lib/dashboard/distribution";
import { getPublicOriginFromHeaders } from "@/lib/public-origin";
import { qrDataUrl } from "@/lib/qr";

const allowed = new Set(["leads", "listings", "distribution", "settings"]);

export default async function DashboardPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section: parts } = await params;
  const section = parts?.[0] ?? "leads";
  if (!allowed.has(section)) redirect("/dashboard/leads");
  const agent = await getAuthenticatedAgent();
  if (!agent) redirect(`/signup?return_to=${encodeURIComponent(dashboardReturnPath(section))}`);

  const summary = await getDashboardSummary(agent);
  const origin = await requestOrigin();
  const url = agentBaseUrl(agent, origin);
  const distribution =
    section === "distribution"
      ? await getDistributionData(agent, summary.leads, origin)
      : { bioTemplates: [], replyTemplates: [], attribution: sourceBreakdown(summary.leads), updatedAt: new Date(0).toISOString() };
  const qr = section === "distribution" ? await qrDataUrl(url) : "";

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
