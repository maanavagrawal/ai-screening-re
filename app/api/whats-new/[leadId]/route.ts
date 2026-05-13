import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateWhatsNew } from "@/lib/ai/anthropic";
import { getEventsForLead } from "@/lib/events";
import { getListingsForAgent } from "@/lib/listings";
import { findLeadById } from "@/lib/leads";
import { resolveAgent } from "@/lib/resolve-agent";
import { LEAD_COOKIE, SESSION_COOKIE } from "@/lib/session";

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
  const events = await getEventsForLead(lead);
  const summary = await generateWhatsNew({ agent, listings, lead, events });

  return NextResponse.json(summary);
}
