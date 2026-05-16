import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { addDevShowingRequest } from "@/lib/dev-store";
import { hasPostgresEnv, query } from "@/lib/db/postgres";
import { logEvents } from "@/lib/events";
import { hasLeadSession } from "@/lib/lead-session-auth";
import { findLeadById, recomputeLeadTemperature, updateLead } from "@/lib/leads";
import { getListingForAgent } from "@/lib/listings";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

const BodySchema = z.object({
  agent_slug: z.string().min(1),
  lead_id: z.string().uuid(),
  listing_id: z.string().uuid(),
  preferred_date: z.string().nullable().optional(),
  preferred_time_of_day: z.enum(["morning", "afternoon", "evening"]).nullable().optional(),
  note: z.string().optional().nullable()
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const body = parsed.data;
  const agent = await resolveAgentBySlug(body.agent_slug);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const lead = await findLeadById(body.lead_id);
  if (!lead || lead.agent_id !== agent.id) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!(await hasLeadSession(lead))) return NextResponse.json({ error: "Lead session not found" }, { status: 403 });
  const listing = await getListingForAgent(agent.id, body.listing_id);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (!lead.phone_verified) return NextResponse.json({ error: "Phone must be verified first" }, { status: 400 });

  const requestRow = hasPostgresEnv()
    ? await (async () => {
        const { rows } = (await query(
          `insert into showing_requests (lead_id, listing_id, preferred_date, preferred_time_of_day, note)
           values ($1, $2, $3, $4, $5)
           returning *`,
          [lead.id, body.listing_id, body.preferred_date ?? null, body.preferred_time_of_day ?? null, body.note ?? null]
        )) ?? { rows: [] };
        return rows[0];
      })()
    : addDevShowingRequest({
        lead_id: lead.id,
        listing_id: body.listing_id,
        preferred_date: body.preferred_date ?? null,
        preferred_time_of_day: body.preferred_time_of_day ?? null,
        note: body.note ?? null
      });

  await updateLead(lead.id, { tier: "requested_showing" });
  await logEvents({
    agent,
    sessionId: lead.session_id,
    leadId: lead.id,
    events: [
      {
        event_type: "showing_request_submitted",
        metadata: { listing_id: body.listing_id }
      }
    ]
  });
  await recomputeLeadTemperature(lead.id);

  return NextResponse.json({ showing_request: requestRow });
}
