import { NextResponse } from "next/server";
import { generateWhatsNew } from "@/lib/ai/anthropic";
import { getEventsForLead } from "@/lib/events";
import { getListingsForAgent } from "@/lib/listings";
import { findLeadById } from "@/lib/leads";
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
  const events = await getEventsForLead(lead);
  const summary = await generateWhatsNew({ agent, listings, lead, events });

  return NextResponse.json(summary);
}
