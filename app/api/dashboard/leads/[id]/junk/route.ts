import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth/session";
import { getDashboardLead } from "@/lib/dashboard/data";
import { logEvents } from "@/lib/events";
import { updateLead } from "@/lib/leads";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await context.params;
  const lead = await getDashboardLead(agent, id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const updated = await updateLead(lead.id, { marked_junk: true });
  await logEvents({
    agent,
    sessionId: lead.session_id,
    leadId: lead.id,
    events: [{ event_type: "lead_marked_junk", metadata: {} }]
  });
  return NextResponse.json({ lead: updated });
}

