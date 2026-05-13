import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/validation";
import { EventBatchSchema, logEvents } from "@/lib/events";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, EventBatchSchema);
  if ("response" in parsed) return parsed.response;

  const body = parsed.data;
  const agent = await resolveAgentBySlug(body.agent_slug);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const events = await logEvents({
    agent,
    sessionId: body.session_id,
    leadId: body.lead_id,
    events: body.events
  });

  return NextResponse.json({ ok: true, count: events?.length ?? body.events.length });
}
