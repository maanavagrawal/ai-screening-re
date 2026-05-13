import {
  createDevLead,
  getDevLeadById,
  getDevLeadForSession,
  getDevMatchReasons,
  updateDevLead,
  upsertDevMatchReasons
} from "@/lib/dev-store";
import { generateBrief, generateMatchReasons } from "@/lib/ai/anthropic";
import { getEventsForLead } from "@/lib/events";
import { getListingsForAgent } from "@/lib/listings";
import { rankListings } from "@/lib/match-score";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Agent, Lead, Preferences } from "@/lib/types";

export async function findLeadById(leadId: string): Promise<Lead | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return getDevLeadById(leadId);

  const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (error) throw new Error(`Failed to load lead: ${error.message}`);
  return (data as Lead | null) ?? null;
}

export async function findLeadForSession(agentId: string, sessionId: string): Promise<Lead | null> {
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
  return lead;
}

export async function updateLead(leadId: string, patch: Partial<Lead>): Promise<Lead | null> {
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

export async function getMatchReasonMap(leadId: string) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return new Map(getDevMatchReasons(leadId).map((row) => [row.listing_id, row.reason]));
  }

  const { data, error } = await supabase.from("lead_match_reasons").select("*").eq("lead_id", leadId);
  if (error) throw new Error(`Failed to load match reasons: ${error.message}`);
  return new Map(((data ?? []) as Array<{ listing_id: string; reason: string }>).map((row) => [row.listing_id, row.reason]));
}
