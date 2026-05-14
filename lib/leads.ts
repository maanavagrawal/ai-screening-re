import {
  createDevLead,
  getDevLeadById,
  getDevLeadForSession,
  getDevLeadsForAgent,
  getDevMatchReasons,
  updateDevLead,
  upsertDevMatchReasons
} from "@/lib/dev-store";
import { generateBrief, generateMatchReasons } from "@/lib/ai/anthropic";
import { computeTemperature } from "@/lib/compute-temperature";
import { hasPostgresEnv, query } from "@/lib/db/postgres";
import { getEventsForLead } from "@/lib/events";
import { getListingsForAgent } from "@/lib/listings";
import { rankListings } from "@/lib/match-score";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Agent, Lead, Preferences } from "@/lib/types";

export async function findLeadById(leadId: string): Promise<Lead | null> {
  if (hasPostgresEnv()) {
    const { rows } = (await query<Lead>("select * from leads where id = $1 limit 1", [leadId])) ?? { rows: [] };
    return rows[0] ?? null;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return getDevLeadById(leadId);

  const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (error) throw new Error(`Failed to load lead: ${error.message}`);
  return (data as Lead | null) ?? null;
}

export async function findLeadForSession(agentId: string, sessionId: string): Promise<Lead | null> {
  if (hasPostgresEnv()) {
    const { rows } = (await query<Lead>(
      "select * from leads where agent_id = $1 and session_id = $2 order by created_at desc limit 1",
      [agentId, sessionId]
    )) ?? { rows: [] };
    return rows[0] ?? null;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return getDevLeadForSession(agentId, sessionId);

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("agent_id", agentId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load session lead: ${error.message}`);
  return (data as Lead | null) ?? null;
}

export async function getLeadsForAgent(agentId: string): Promise<Lead[]> {
  if (hasPostgresEnv()) {
    const { rows } = (await query<Lead>("select * from leads where agent_id = $1 order by created_at desc", [agentId])) ?? { rows: [] };
    return rows;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return getDevLeadsForAgent(agentId);

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load leads: ${error.message}`);
  return (data ?? []) as Lead[];
}

export async function createLead(input: {
  agent: Agent;
  sessionId: string;
  phone: string;
  email: string;
  preferences: Preferences;
  freeTextRaw?: string | null;
  preapprovalUrl?: string | null;
  firstName?: string | null;
}): Promise<Lead> {
  const tier = input.preferences.tier_hint === "browsing" ? "browsing" : "captured";
  if (hasPostgresEnv()) {
    const { rows } = (await query<Lead>(
      `insert into leads (
        agent_id, session_id, first_name, phone, email, preferences, free_text_raw,
        preapproval_url, tier, source
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      returning *`,
      [
        input.agent.id,
        input.sessionId,
        input.firstName ?? null,
        input.phone,
        input.email,
        JSON.stringify(input.preferences),
        input.freeTextRaw ?? null,
        input.preapprovalUrl ?? null,
        tier,
        input.preferences.source ?? "direct"
      ]
    )) ?? { rows: [] };
    const lead = rows[0];
    await query(
      "update events set lead_id = $1, agent_id = $2 where session_id = $3 and agent_id = $2 and lead_id is null",
      [lead.id, input.agent.id, input.sessionId]
    );
    await runLeadSideEffects(input.agent, lead);
    await recomputeLeadTemperature(lead.id);
    return lead;
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    const lead = createDevLead({
      agentId: input.agent.id,
      sessionId: input.sessionId,
      firstName: input.firstName ?? null,
      phone: input.phone,
      email: input.email,
      preferences: input.preferences,
      freeTextRaw: input.freeTextRaw,
      preapprovalUrl: input.preapprovalUrl,
      tier
    });
    await runLeadSideEffects(input.agent, lead);
    await recomputeLeadTemperature(lead.id);
    return lead;
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      agent_id: input.agent.id,
      session_id: input.sessionId,
      first_name: input.firstName ?? null,
      phone: input.phone,
      email: input.email,
      preferences: input.preferences,
      free_text_raw: input.freeTextRaw ?? null,
      preapproval_url: input.preapprovalUrl ?? null,
      tier
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create lead: ${error.message}`);

  const lead = data as Lead;

  await supabase
    .from("events")
    .update({ lead_id: lead.id, agent_id: input.agent.id })
    .eq("session_id", input.sessionId)
    .eq("agent_id", input.agent.id)
    .is("lead_id", null);

  await runLeadSideEffects(input.agent, lead);
  await recomputeLeadTemperature(lead.id);
  return lead;
}

export async function updateLead(leadId: string, patch: Partial<Lead>): Promise<Lead | null> {
  if (hasPostgresEnv()) {
    const keys = Object.keys(patch).filter((key) => key !== "id") as Array<keyof Lead>;
    if (!keys.length) return findLeadById(leadId);
    const assignments = keys.map((key, index) => `${String(key)} = $${index + 2}`).join(", ");
    const values = keys.map((key) => {
      const value = patch[key];
      return key === "preferences" || key === "brief" ? JSON.stringify(value) : value;
    });
    const { rows } = (await query<Lead>(
      `update leads set ${assignments} where id = $1 returning *`,
      [leadId, ...values]
    )) ?? { rows: [] };
    return rows[0] ?? null;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return updateDevLead(leadId, patch);

  const { data, error } = await supabase.from("leads").update(patch).eq("id", leadId).select("*").single();
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
  return data as Lead;
}

export async function runLeadSideEffects(agent: Agent, lead: Lead) {
  const listings = await getListingsForAgent(agent.id);
  const ranked = rankListings(listings, lead.preferences).map((item) => item.listing);
  const events = await getEventsForLead(lead);
  const [brief, reasons] = await Promise.all([
    generateBrief({ agent, listings, lead, events }),
    generateMatchReasons({
      agent,
      listings: ranked.slice(0, 10),
      preferences: lead.preferences,
      freeTextRaw: lead.free_text_raw
    })
  ]);

  const supabase = getServiceSupabase();
  if (hasPostgresEnv()) {
    await query("update leads set brief = $1 where id = $2", [JSON.stringify(brief), lead.id]);
    for (const reason of reasons.reasons) {
      await query(
        `insert into lead_match_reasons (lead_id, listing_id, reason)
         values ($1, $2, $3)
         on conflict (lead_id, listing_id) do update
         set reason = excluded.reason,
             generated_at = now()`,
        [lead.id, reason.listing_id, reason.match_reason]
      );
    }
    return;
  }

  if (!supabase) {
    updateDevLead(lead.id, { brief });
    upsertDevMatchReasons(
      reasons.reasons.map((reason) => ({
        lead_id: lead.id,
        listing_id: reason.listing_id,
        reason: reason.match_reason,
        generated_at: new Date().toISOString()
      }))
    );
    return;
  }

  await supabase.from("leads").update({ brief }).eq("id", lead.id);
  await supabase.from("lead_match_reasons").upsert(
    reasons.reasons.map((reason) => ({
      lead_id: lead.id,
      listing_id: reason.listing_id,
      reason: reason.match_reason
    })),
    { onConflict: "lead_id,listing_id" }
  );
}

export async function recomputeLeadTemperature(leadId: string): Promise<Lead | null> {
  const lead = await findLeadById(leadId);
  if (!lead) return null;
  const events = await getEventsForLead(lead);
  const result = computeTemperature(lead, events);
  return updateLead(lead.id, {
    temperature: result.temperature,
    temperature_score: result.score,
    temperature_reasons: result.reasons
  });
}

export async function getMatchReasonMap(leadId: string) {
  if (hasPostgresEnv()) {
    const { rows } = (await query<{ listing_id: string; reason: string }>(
      "select listing_id, reason from lead_match_reasons where lead_id = $1",
      [leadId]
    )) ?? { rows: [] };
    return new Map(rows.map((row) => [row.listing_id, row.reason]));
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return new Map(getDevMatchReasons(leadId).map((row) => [row.listing_id, row.reason]));
  }

  const { data, error } = await supabase.from("lead_match_reasons").select("*").eq("lead_id", leadId);
  if (error) throw new Error(`Failed to load match reasons: ${error.message}`);
  return new Map(((data ?? []) as Array<{ listing_id: string; reason: string }>).map((row) => [row.listing_id, row.reason]));
}
