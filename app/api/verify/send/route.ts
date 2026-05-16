import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { setDevVerifyCode } from "@/lib/dev-store";
import { logEvents } from "@/lib/events";
import { hasLeadSession } from "@/lib/lead-session-auth";
import { findLeadById } from "@/lib/leads";
import { resolveAgentBySlug } from "@/lib/resolve-agent";
import { twilioVerifyFailure } from "@/lib/twilio-errors";

const BodySchema = z.object({
  agent_slug: z.string().min(1),
  lead_id: z.string().uuid(),
  listing_id: z.string().optional()
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
  if (!(await hasLeadSession(lead))) return NextResponse.json({ error: "Lead session not found" }, { status: 403 });

  if (canUseTwilio()) {
    const { default: twilio } = await import("twilio");
    const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN as string;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID as string;
    const client = twilio(accountSid, authToken);
    try {
      await client.verify.v2
        .services(verifyServiceSid)
        .verifications.create({ to: lead.phone, channel: "sms" });
    } catch (error) {
      const failure = twilioVerifyFailure(error);
      if (failure) return NextResponse.json(failure.body, { status: failure.status });
      throw error;
    }
  } else {
    setDevVerifyCode(lead.id, "123456");
  }

  await logEvents({
    agent,
    sessionId: lead.session_id,
    leadId: lead.id,
    events: [
      {
        event_type: "showing_verification_started",
        metadata: { listing_id: body.listing_id }
      }
    ]
  });

  return NextResponse.json({ ok: true });
}
