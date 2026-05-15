import { getEventsForLead, logEvents } from "@/lib/events";
import { getListingsForAgent } from "@/lib/listings";
import { getLeadsForAgent, updateLead } from "@/lib/leads";
import { hasPostgresEnv, query as pgQuery } from "@/lib/db/postgres";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Agent, DashboardLead, Lead, ShowingRequest } from "@/lib/types";

export type LeadFilter = "all" | "hot" | "warm" | "browsing" | "showings";
export type LeadSort = "priority" | "newest" | "last_activity";

export type LeadListOptions = {
  filter?: LeadFilter;
  search?: string;
  sort?: LeadSort;
};

const temperatureRank = { hot: 0, warm: 1, browsing: 2 } as const;

function searchableLead(lead: Lead) {
  const brief = lead.brief as { one_line_summary?: string; suggested_opener?: string } | null;
  return [
    lead.first_name,
    lead.phone,
    lead.email,
    lead.free_text_raw,
    brief?.one_line_summary,
    brief?.suggested_opener,
    JSON.stringify(lead.preferences),
    lead.source,
    lead.tier,
    lead.temperature
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export async function getDashboardLeads(
  agent: Agent,
  options: LeadListOptions = {}
): Promise<DashboardLead[]> {
  const leads = (await getLeadsForAgent(agent.id)).filter((lead) => !lead.marked_junk);
  const enriched = await Promise.all(
    leads.map(async (lead) => {
      const [events, showingRequests] = await Promise.all([
        getEventsForLead(lead),
        getShowingRequestsForLead(lead.id)
      ]);
      const lastEvent = events.at(-1);
      return {
        ...lead,
        events,
        showing_requests: showingRequests,
        last_activity_at: lastEvent?.created_at ?? lead.created_at
      };
    })
  );

  const filter = options.filter ?? "all";
  const query = options.search?.trim().toLowerCase();

  return enriched
    .filter((lead) => {
      if (filter === "showings") return lead.tier === "requested_showing" || lead.showing_requests.length > 0;
      if (filter === "all") return true;
      return lead.temperature === filter || lead.tier === filter;
    })
    .filter((lead) => (query ? searchableLead(lead).includes(query) : true))
    .sort((a, b) => {
      if (options.sort === "newest") return b.created_at.localeCompare(a.created_at);
      if (options.sort === "last_activity") return b.last_activity_at.localeCompare(a.last_activity_at);
      const aTemp = temperatureRank[(a.temperature ?? "browsing") as keyof typeof temperatureRank] ?? 3;
      const bTemp = temperatureRank[(b.temperature ?? "browsing") as keyof typeof temperatureRank] ?? 3;
      if (aTemp !== bTemp) return aTemp - bTemp;
      if ((b.temperature_score ?? 0) !== (a.temperature_score ?? 0)) {
        return (b.temperature_score ?? 0) - (a.temperature_score ?? 0);
      }
      return b.last_activity_at.localeCompare(a.last_activity_at);
    });
}

export async function getDashboardLead(agent: Agent, leadId: string): Promise<DashboardLead | null> {
  const leads = await getDashboardLeads(agent);
  return leads.find((lead) => lead.id === leadId) ?? null;
}

export async function getDashboardSummary(agent: Agent) {
  const [leads, listings] = await Promise.all([getDashboardLeads(agent), getListingsForAgent(agent.id)]);
  return {
    agent,
    listings,
    leads,
    counts: {
      all: leads.length,
      hot: leads.filter((lead) => lead.temperature === "hot").length,
      warm: leads.filter((lead) => lead.temperature === "warm").length,
      browsing: leads.filter((lead) => lead.temperature === "browsing" || lead.tier === "browsing").length,
      showings: leads.filter((lead) => lead.tier === "requested_showing" || lead.showing_requests.length).length
    }
  };
}

export async function getShowingRequestsForLead(leadId: string): Promise<ShowingRequest[]> {
  if (hasPostgresEnv()) {
    const { rows } = (await pgQuery<ShowingRequest>(
      "select * from showing_requests where lead_id = $1 order by created_at desc",
      [leadId]
    )) ?? { rows: [] };
    return rows;
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    const { devStore } = await import("@/lib/dev-store");
    return devStore().showingRequests.filter((request) => request.lead_id === leadId);
  }

  const { data, error } = await supabase
    .from("showing_requests")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load showing requests: ${error.message}`);
  return (data ?? []) as ShowingRequest[];
}

export async function markLeadContacted(agent: Agent, lead: Lead) {
  const updated = await updateLead(lead.id, { last_contacted_at: new Date().toISOString() });
  await logEvents({
    agent,
    sessionId: lead.session_id,
    leadId: lead.id,
    events: [{ event_type: "lead_marked_contacted", metadata: {} }]
  });
  return updated;
}
