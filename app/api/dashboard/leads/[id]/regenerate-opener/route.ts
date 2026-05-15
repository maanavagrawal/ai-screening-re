import { NextResponse } from "next/server";
import { z } from "zod";
import { regenerateOpener } from "@/lib/ai/anthropic";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentAgent } from "@/lib/auth/session";
import { getDashboardLead } from "@/lib/dashboard/data";
import { isSellerLead } from "@/lib/lead-intent";
import { updateLead } from "@/lib/leads";

const BodySchema = z.object({
  tone_hint: z.enum(["shorter", "warmer", "more_direct"]).optional().nullable()
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const { id } = await context.params;
  const lead = await getDashboardLead(agent, id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (isSellerLead(lead)) {
    return NextResponse.json({ error: "Seller openers are generated from inquiry details" }, { status: 400 });
  }

  const opener = await regenerateOpener({
    agent,
    lead,
    events: lead.events,
    toneHint: parsed.data.tone_hint
  });
  const brief = {
    ...((lead.brief as Record<string, unknown> | null) ?? {}),
    suggested_opener: opener.suggested_opener
  };
  const updated = await updateLead(lead.id, { brief });
  return NextResponse.json({ lead: updated, suggested_opener: opener.suggested_opener });
}
