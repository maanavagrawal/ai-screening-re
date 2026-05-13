import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BuyerViewport } from "@/components/shell/buyer-viewport";
import { MatchesFeed } from "@/components/matches/matches-feed";
import { resolveAgentBySlug } from "@/lib/resolve-agent";
import { LEAD_COOKIE } from "@/lib/session";

export default async function MatchesPage({ params }: { params: Promise<{ agentSlug: string }> }) {
  const { agentSlug } = await params;
  const agent = await resolveAgentBySlug(agentSlug);
  if (!agent) notFound();
  const leadId = (await cookies()).get(LEAD_COOKIE)?.value;

  return (
    <BuyerViewport>
      <MatchesFeed agent={agent} initialLeadId={leadId} />
    </BuyerViewport>
  );
}
