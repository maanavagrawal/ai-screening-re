import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { checkDevVerifyCode } from "@/lib/dev-store";
import { logEvents } from "@/lib/events";
import { findLeadById, recomputeLeadTemperature, updateLead } from "@/lib/leads";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

const BodySchema = z.object({
  agent_slug: z.string().min(1),
  lead_id: z.string().uuid(),
  listing_id: z.string().optional(),
  code: z.string().min(4).max(10)
});

function canUseTwilio() {
  return Boolean(
    process.env.DISABLE_TWILIO !== "1" &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID
  );
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const body = parsed.data;
  const agent = await resolveAgentBySlug(body.agent_slug);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const lead = await findLeadById(body.lead_id);
  if (!lead || lead.agent_id !== agent.id) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  let approved = false;
  if (canUseTwilio()) {
    const { default: twilio } = await import("twilio");
    const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN as string;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID as string;
    const client = twilio(accountSid, authToken);
    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: lead.phone, code: body.code });
    approved = check.status === "approved";
  } else {
    approved = checkDevVerifyCode(lead.id, body.code);
  }

  if (!approved) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const updated = await updateLead(lead.id, { phone_verified: true });
  await logEvents({
    agent,
    sessionId: lead.session_id,
    leadId: lead.id,
    events: [
      {
        event_type: "showing_verification_completed",
        metadata: { listing_id: body.listing_id }
      }
    ]
  });
  await recomputeLeadTemperature(lead.id);

  return NextResponse.json({ lead: updated });
}
