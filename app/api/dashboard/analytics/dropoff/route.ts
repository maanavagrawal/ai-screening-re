import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth/session";
import { getDropoffAnalytics } from "@/lib/dashboard/dropoff";

export async function GET() {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  return NextResponse.json({ analytics: await getDropoffAnalytics(agent.id) });
}
