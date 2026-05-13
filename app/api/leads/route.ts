import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { IntakeAnswersSchema } from "@/lib/ai/schemas";
import { logEvents } from "@/lib/events";
import { createLead } from "@/lib/leads";
import { normalizePhone, isValidEmail } from "@/lib/phone";
import { LEAD_COOKIE, SESSION_COOKIE } from "@/lib/session";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

const BodySchema = z.object({
  agent_slug: z.string().min(1),
  session_id: z.string().min(8),
  first_name: z.string().optional().nullable(),
  phone: z.string().min(4),
  email: z.string().email(),
  preferences: IntakeAnswersSchema,
  free_text_raw: z.string().optional().nullable(),
  preapproval_url: z.string().optional().nullable()
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const body = parsed.data;
  const agent = await resolveAgentBySlug(body.agent_slug);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const phone = normalizePhone(body.phone);
  if (!phone || !isValidEmail(body.email)) {
    return NextResponse.json({ error: "Valid phone and email are required" }, { status: 400 });
  }

  const lead = await createLead({
    agent,
    sessionId: body.session_id,
    phone,
    email: body.email,
    firstName: body.first_name,
    preferences: body.preferences,
    freeTextRaw: body.free_text_raw,
    preapprovalUrl: body.preapproval_url
  });

  await logEvents({
    agent,
    sessionId: body.session_id,
    leadId: lead.id,
    events: [
      { event_type: "phone_submitted", metadata: {} },
      { event_type: "email_submitted", metadata: {} },
      { event_type: "lead_created", metadata: { tier: lead.tier } }
    ]
  });

  const response = NextResponse.json({ lead });
  response.cookies.set(SESSION_COOKIE, body.session_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180
  });
  response.cookies.set(LEAD_COOKIE, lead.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180
  });

  return response;
}
