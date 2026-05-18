import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getListingsForAgent } from "@/lib/listings";
import { findLeadById, getMatchReasonMap } from "@/lib/leads";
import { redactKnownListingAddresses, redactListingForBuyer } from "@/lib/listing-privacy";
import { matchScore, rankListings } from "@/lib/match-score";
import { resolveAgent } from "@/lib/resolve-agent";
import { LEAD_COOKIE, SESSION_COOKIE } from "@/lib/session";
import type { Agent, Listing } from "@/lib/types";

type BuyerMatch = {
  listing: Listing;
  score: number;
  match_reason: string;
};

function fallbackReason(agent: Agent, listing: Listing, mode: "recommended" | "all") {
  const location = listing.neighborhood ?? agent.market;
  if (mode === "recommended") {
    return `${location} fits your search with ${listing.beds} beds and ${listing.baths} baths.`;
  }
  return `${location} is one of ${agent.name}'s current listings. Browse it alongside the rest of their available homes.`;
}

function toBuyerMatch(input: {
  agent: Agent;
  listing: Listing;
  score: number;
  listings: Listing[];
  reasonMap: Map<string, string>;
  mode: "recommended" | "all";
}): BuyerMatch {
  return {
    listing: redactListingForBuyer(input.listing),
    score: input.score,
    match_reason: redactKnownListingAddresses(
      input.reasonMap.get(input.listing.id) ?? fallbackReason(input.agent, input.listing, input.mode),
      input.listings
    )
  };
}

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
  const cookieStore = await cookies();
  const cookieLeadId = cookieStore.get(LEAD_COOKIE)?.value;
  const cookieSessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (cookieLeadId !== lead.id && cookieSessionId !== lead.session_id) {
    return NextResponse.json({ error: "Lead session required" }, { status: 403 });
  }

  const listings = await getListingsForAgent(agent.id);
  const reasonMap = await getMatchReasonMap(lead.id);
  const ranked = rankListings(listings, lead.preferences);
  const recommendedMatches = ranked.map(({ listing, score }) =>
    toBuyerMatch({ agent, listing, score, listings, reasonMap, mode: "recommended" })
  );
  const allMatches = listings.map((listing) =>
    toBuyerMatch({
      agent,
      listing,
      score: matchScore(listing, lead.preferences),
      listings,
      reasonMap,
      mode: "all"
    })
  );
  const defaultTab = recommendedMatches.length > 0 ? "recommended" : "all";

  return NextResponse.json({
    lead,
    matches: defaultTab === "recommended" ? recommendedMatches : allMatches,
    recommendedMatches,
    allMatches,
    defaultTab
  });
}
