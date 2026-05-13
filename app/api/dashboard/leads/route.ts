import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth/session";
import { getDashboardLeads, type LeadFilter, type LeadSort } from "@/lib/dashboard/data";

export async function GET(request: Request) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(request.url);
  const filter = (url.searchParams.get("filter") ?? "all") as LeadFilter;
  const sort = (url.searchParams.get("sort") ?? "priority") as LeadSort;
  const search = url.searchParams.get("search") ?? "";

  const leads = await getDashboardLeads(agent, { filter, sort, search });
  return NextResponse.json({ leads });
}

