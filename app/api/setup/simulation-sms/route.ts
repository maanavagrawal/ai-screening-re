import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth/session";

export async function POST() {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  console.info("[setup:sample-sms]", { agent: agent.slug, phone: agent.phone });
  return NextResponse.json({ ok: true });
}

