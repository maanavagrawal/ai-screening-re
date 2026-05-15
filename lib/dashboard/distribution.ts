import { generateReplyTemplates } from "@/lib/ai/anthropic";
import { getDevDistributionCache, setDevDistributionCache } from "@/lib/dev-store";
import { hasPostgresEnv, query } from "@/lib/db/postgres";
import { agentBaseUrl } from "@/lib/dashboard/client-utils";
import { getListingsForAgent } from "@/lib/listings";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Agent, Lead } from "@/lib/types";

export type DistributionTemplate = {
  scenario: string;
  template_text: string;
};

export type DistributionData = {
  bioTemplates: string[];
  replyTemplates: DistributionTemplate[];
  attribution: Array<{ source: string; leads: number; hot: number; showings: number; conversionRate: number }>;
  updatedAt: string;
};

function defaultBioTemplates(agent: Agent, url: string) {
  const name = agent.name.split(" ")[0] ?? agent.name;
  return [
    `Buying in ${agent.market}? I built a quick matching page so you can see homes that actually fit: ${url}`,
    `${name}'s buyer link: curated ${agent.market} homes, off-market picks, and showing requests in one place. ${url}`,
    `Tell me what you want in a home and I’ll show you the short list. Start here: ${url}`
  ];
}

export async function getDistributionData(agent: Agent, leads: Lead[], origin?: string): Promise<DistributionData> {
  const url = agentBaseUrl(agent, origin);
  if (hasPostgresEnv()) {
    const { rows } = (await query<{ data: DistributionData }>(
      "select data from agent_distribution_templates where agent_id = $1 limit 1",
      [agent.id]
    )) ?? { rows: [] };
    if (rows[0]?.data && JSON.stringify(rows[0].data).includes(url)) {
      return { ...rows[0].data, attribution: sourceBreakdown(leads) };
    }
    return regenerateDistributionData(agent, leads, origin);
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    const cached = getDevDistributionCache(agent.id);
    if (cached) {
      const data = cached.data as DistributionData;
      if (JSON.stringify(data).includes(url)) return { ...data, attribution: sourceBreakdown(leads) };
    }
  } else {
    const { data } = await supabase
      .from("agent_distribution_templates")
      .select("data, updated_at")
      .eq("agent_id", agent.id)
      .maybeSingle();
    if (data?.data) {
      const cached = data.data as DistributionData;
      if (JSON.stringify(cached).includes(url)) return { ...cached, attribution: sourceBreakdown(leads) };
    }
  }

  return regenerateDistributionData(agent, leads, origin);
}

export async function regenerateDistributionData(agent: Agent, leads: Lead[], origin?: string): Promise<DistributionData> {
  const listings = await getListingsForAgent(agent.id);
  const url = agentBaseUrl(agent, origin);
  const templates = await generateReplyTemplates({ agent, listings, baseUrl: url });
  const data: DistributionData = {
    bioTemplates: defaultBioTemplates(agent, url),
    replyTemplates: templates.templates,
    attribution: sourceBreakdown(leads),
    updatedAt: new Date().toISOString()
  };

  const supabase = getServiceSupabase();
  if (hasPostgresEnv()) {
    await cacheDistributionDataInPostgres(agent.id, data);
    return data;
  }

  if (!supabase) {
    setDevDistributionCache(agent.id, data as unknown as Record<string, unknown>);
    return data;
  }

  await supabase.from("agent_distribution_templates").upsert(
    {
      agent_id: agent.id,
      data,
      updated_at: data.updatedAt
    },
    { onConflict: "agent_id" }
  );
  return data;
}

async function cacheDistributionDataInPostgres(agentId: string, data: DistributionData) {
  const agentExists = await query<{ id: string }>("select id from agents where id = $1 limit 1", [agentId]);
  if (!agentExists?.rows[0]) return;

  try {
    await query(
      `insert into agent_distribution_templates (agent_id, data, updated_at)
       values ($1, $2, now())
       on conflict (agent_id) do update
       set data = excluded.data,
           updated_at = now()`,
      [agentId, JSON.stringify(data)]
    );
  } catch (error) {
    if (isForeignKeyViolation(error, "agent_distribution_templates_agent_id_fkey")) return;
    throw error;
  }
}

function isForeignKeyViolation(error: unknown, constraint: string) {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  return record.code === "23503" && record.constraint === constraint;
}

export function sourceBreakdown(leads: Lead[]) {
  const counts = new Map<string, { source: string; leads: number; hot: number; showings: number }>();
  for (const lead of leads) {
    const source = lead.source || lead.preferences.source || "direct";
    const row = counts.get(source) ?? { source, leads: 0, hot: 0, showings: 0 };
    row.leads += 1;
    if (lead.temperature === "hot") row.hot += 1;
    if (lead.tier === "requested_showing") row.showings += 1;
    counts.set(source, row);
  }
  return Array.from(counts.values())
    .map((row) => ({ ...row, conversionRate: row.leads ? Math.round((row.showings / row.leads) * 100) : 0 }))
    .sort((a, b) => b.leads - a.leads);
}
