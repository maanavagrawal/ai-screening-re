import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth/session";
import { regenerateDistributionData } from "@/lib/dashboard/distribution";
import { getLeadsForAgent } from "@/lib/leads";

export async function POST(request: Request) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const leads = await getLeadsForAgent(agent.id);
  const data = await regenerateDistributionData(agent, leads, new URL(request.url).origin);
  return NextResponse.json(data);
}
