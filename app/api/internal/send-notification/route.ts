import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { requireInternalRequest } from "@/lib/internal-auth";
import { sendAgentNotification } from "@/lib/notifications";
import { findLeadById } from "@/lib/leads";
import { getListingForAgent } from "@/lib/listings";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

const BodySchema = z.object({
  agent_slug: z.string(),
  lead_id: z.string().uuid(),
  listing_id: z.string().uuid().optional(),
  kind: z.enum(["new_lead", "showing_requested", "hot_lead", "sample"]),
  message: z.string().optional()
});

export async function POST(request: Request) {
  const unauthorized = requireInternalRequest(request);
  if (unauthorized) return unauthorized;

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const agent = await resolveAgentBySlug(parsed.data.agent_slug);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  const lead = await findLeadById(parsed.data.lead_id);
  if (!lead || lead.agent_id !== agent.id) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const listing = parsed.data.listing_id ? await getListingForAgent(agent.id, parsed.data.listing_id) : null;
  return NextResponse.json(await sendAgentNotification({ agent, lead, listing, kind: parsed.data.kind, message: parsed.data.message }));
}
