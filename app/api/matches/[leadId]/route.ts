import { NextResponse } from "next/server";
import { getListingsForAgent } from "@/lib/listings";
import { findLeadById, getMatchReasonMap } from "@/lib/leads";
import { rankListings } from "@/lib/match-score";
import { resolveAgent } from "@/lib/resolve-agent";

export async function GET(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await context.params;
  const agent = await resolveAgent(request);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const lead = await findLeadById(leadId);
  if (!lead || lead.agent_id !== agent.id) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const listings = await getListingsForAgent(agent.id);
  const reasonMap = await getMatchReasonMap(lead.id);
  const ranked = rankListings(listings, lead.preferences);

  return NextResponse.json({
    lead,
    matches: ranked.map(({ listing, score }) => ({
      listing,
      score,
      match_reason:
        reasonMap.get(listing.id) ??
        `${listing.neighborhood ?? agent.market} fits your search with ${listing.beds} beds and ${listing.baths} baths.`
    }))
  });
}
