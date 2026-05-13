import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentAgent } from "@/lib/auth/session";
import { getDashboardLead } from "@/lib/dashboard/data";
import { logEvents } from "@/lib/events";
import { updateLead } from "@/lib/leads";

const BodySchema = z.object({
  hours: z.number().int().min(1).max(168).default(24)
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const { id } = await context.params;
  const lead = await getDashboardLead(agent, id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const snoozedUntil = new Date(Date.now() + parsed.data.hours * 60 * 60 * 1000).toISOString();
  const updated = await updateLead(lead.id, { snoozed_until: snoozedUntil });
  await logEvents({
    agent,
    sessionId: lead.session_id,
    leadId: lead.id,
    events: [{ event_type: "lead_snoozed", metadata: { until: snoozedUntil } }]
  });
  return NextResponse.json({ lead: updated });
}

