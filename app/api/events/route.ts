import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/validation";
import { EventBatchSchema, logEvents } from "@/lib/events";
import { findLeadById, recomputeLeadTemperature } from "@/lib/leads";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, EventBatchSchema);
  if ("response" in parsed) return parsed.response;

  const body = parsed.data;
  const agent = await resolveAgentBySlug(body.agent_slug);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const lead = body.lead_id ? await findLeadById(body.lead_id) : null;
  if (body.lead_id && (!lead || lead.agent_id !== agent.id || lead.session_id !== body.session_id)) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const events = await logEvents({
    agent,
    sessionId: body.session_id,
    leadId: lead?.id,
    events: body.events
  });

  if (lead) {
    await recomputeLeadTemperature(lead.id);
  }

  return NextResponse.json({ ok: true, count: events?.length ?? body.events.length });
}
