import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { logEvents } from "@/lib/events";
import { createLead } from "@/lib/leads";
import { normalizePhone, isValidEmail } from "@/lib/phone";
import { resolveAgentBySlug } from "@/lib/resolve-agent";
import { LEAD_COOKIE, SESSION_COOKIE } from "@/lib/session";

const BodySchema = z.object({
  agent_slug: z.string().min(1),
  session_id: z.string().min(8),
  first_name: z.string().min(1),
  phone: z.string().min(4),
  email: z.string().email(),
  property_address: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  timeframe: z
    .enum(["asap", "1_3_months", "3_6_months", "6_plus_months", "just_curious", "custom"])
    .default("custom"),
  notes: z.string().optional().nullable()
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

  const propertyAddress = body.property_address?.trim() || null;
  const neighborhood = body.neighborhood?.trim() || null;
  if (!propertyAddress && !neighborhood) {
    return NextResponse.json(
      { error: "Property address or neighborhood is required" },
      { status: 400 }
    );
  }

  const notes = body.notes?.trim() || null;
  const lead = await createLead({
    agent,
    kind: "seller",
    sessionId: body.session_id,
    phone,
    email: body.email,
    firstName: body.first_name,
    freeTextRaw: notes,
    preferences: {
      intent: "seller",
      source: "seller_entry",
      seller: {
        property_address: propertyAddress,
        neighborhood,
        timeframe: body.timeframe,
        notes
      }
    }
  });

  await logEvents({
    agent,
    sessionId: body.session_id,
    leadId: lead.id,
    events: [{ event_type: "seller_inquiry_created", metadata: { timeframe: body.timeframe } }]
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
