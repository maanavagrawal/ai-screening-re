import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth/session";
import { getDashboardLead, markLeadContacted } from "@/lib/dashboard/data";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await context.params;
  const lead = await getDashboardLead(agent, id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  return NextResponse.json({ lead: await markLeadContacted(agent, lead) });
}

