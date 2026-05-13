import { generateReplyTemplates } from "@/lib/ai/anthropic";
import { getDevDistributionCache, setDevDistributionCache } from "@/lib/dev-store";
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

export function agentBaseUrl(agent: Agent, origin?: string) {
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
  const base = process.env.NEXT_PUBLIC_APP_URL || origin || browserOrigin || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${agent.slug}`;
}

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
