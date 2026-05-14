import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BuyerViewport } from "@/components/shell/buyer-viewport";
import { AgentLanding } from "@/components/landing/agent-landing";
import { ReturningVisitor } from "@/components/landing/returning-visitor";
import { generateWhatsNew } from "@/lib/ai/anthropic";
import { getEventsForLead } from "@/lib/events";
import { findLeadById } from "@/lib/leads";
import { redactListingsForBuyer } from "@/lib/listing-privacy";
import { getListingsForAgent } from "@/lib/listings";
import { resolveAgentBySlug } from "@/lib/resolve-agent";
import { LEAD_COOKIE } from "@/lib/session";

export default async function AgentPage({ params }: { params: Promise<{ agentSlug: string }> }) {
  const { agentSlug } = await params;
  const agent = await resolveAgentBySlug(agentSlug);
  if (!agent) notFound();

  const listings = await getListingsForAgent(agent.id);
  const buyerListings = redactListingsForBuyer(listings);
  const leadId = (await cookies()).get(LEAD_COOKIE)?.value;
  const lead = leadId ? await findLeadById(leadId) : null;

  let summary: string | null = null;
  if (lead && lead.agent_id === agent.id) {
    summary = (
      await generateWhatsNew({
        agent,
        listings,
        lead,
        events: await getEventsForLead(lead)
      })
    ).summary;
  }

  return (
    <BuyerViewport>
      {lead && summary ? <ReturningVisitor agent={agent} lead={lead} summary={summary} /> : <AgentLanding agent={agent} listings={buyerListings} />}
    </BuyerViewport>
  );
}
