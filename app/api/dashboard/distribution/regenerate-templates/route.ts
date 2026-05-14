import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth/session";
import { regenerateDistributionData } from "@/lib/dashboard/distribution";
import { getLeadsForAgent } from "@/lib/leads";
import { getPublicOriginFromRequest } from "@/lib/public-origin";

export async function POST(request: Request) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const leads = await getLeadsForAgent(agent.id);
  const data = await regenerateDistributionData(agent, leads, getPublicOriginFromRequest(request) ?? undefined);
  return NextResponse.json(data);
}
