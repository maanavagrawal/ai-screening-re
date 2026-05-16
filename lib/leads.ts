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
import { isSellerLead, sellerDetails } from "@/lib/lead-intent";
import { getListingsForAgent } from "@/lib/listings";
import { rankListings } from "@/lib/match-score";
import type { Agent, Lead, Preferences } from "@/lib/types";

export async function findLeadById(leadId: string): Promise<Lead | null> {
  if (hasPostgresEnv()) {
    const { rows } = (await query<Lead>("select * from leads where id = $1 limit 1", [leadId])) ?? { rows: [] };
    return rows[0] ?? null;
  }

  return getDevLeadById(leadId);
}

export async function findLeadForSession(agentId: string, sessionId: string): Promise<Lead | null> {
  if (hasPostgresEnv()) {
    const { rows } = (await query<Lead>(
      "select * from leads where agent_id = $1 and session_id = $2 order by created_at desc limit 1",
      [agentId, sessionId]
    )) ?? { rows: [] };
    return rows[0] ?? null;
  }

  return getDevLeadForSession(agentId, sessionId);
}

export async function getLeadsForAgent(agentId: string): Promise<Lead[]> {
  if (hasPostgresEnv()) {
    const { rows } = (await query<Lead>("select * from leads where agent_id = $1 order by created_at desc", [agentId])) ?? { rows: [] };
    return rows;
  }

  return getDevLeadsForAgent(agentId);
}

export async function createLead(input: {
  agent: Agent;
  sessionId: string;
  kind?: "buyer" | "seller";
  phone: string;
  email: string;
  preferences: Preferences;
  freeTextRaw?: string | null;
  preapprovalUrl?: string | null;
  firstName?: string | null;
}): Promise<Lead> {
  const tier = input.preferences.tier_hint === "browsing" ? "browsing" : "captured";
  const kind = input.kind ?? (input.preferences.intent === "seller" ? "seller" : "buyer");
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
    if (kind === "seller") {
      await runSellerLeadSideEffects(input.agent, lead);
    } else {
      await runLeadSideEffects(input.agent, lead);
      await recomputeLeadTemperature(lead.id);
    }
    return lead;
  }

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
  if (kind === "seller") {
    await runSellerLeadSideEffects(input.agent, lead);
  } else {
    await runLeadSideEffects(input.agent, lead);
    await recomputeLeadTemperature(lead.id);
  }
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

  return updateDevLead(leadId, patch);
}

export async function runLeadSideEffects(agent: Agent, lead: Lead) {
  if (isSellerLead(lead)) {
    await runSellerLeadSideEffects(agent, lead);
    return;
  }

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

  updateDevLead(lead.id, { brief });
  upsertDevMatchReasons(
    reasons.reasons.map((reason) => ({
      lead_id: lead.id,
      listing_id: reason.listing_id,
      reason: reason.match_reason,
      generated_at: new Date().toISOString()
    }))
  );
}

export async function runSellerLeadSideEffects(agent: Agent, lead: Lead) {
  const brief = sellerLeadBrief(agent, lead);

  if (hasPostgresEnv()) {
    await query(
      `update leads
       set brief = $1,
           temperature = 'warm',
           temperature_score = 2,
           temperature_reasons = $2
       where id = $3`,
      [JSON.stringify(brief), ["Seller inquiry"], lead.id]
    );
    return;
  }

  updateDevLead(lead.id, {
    brief,
    temperature: "warm",
    temperature_score: 2,
    temperature_reasons: ["Seller inquiry"]
  });
}

export async function recomputeLeadTemperature(leadId: string): Promise<Lead | null> {
  const lead = await findLeadById(leadId);
  if (!lead) return null;
  if (isSellerLead(lead)) {
    return updateLead(lead.id, {
      temperature: "warm",
      temperature_score: 2,
      temperature_reasons: ["Seller inquiry"]
    });
  }
  const events = await getEventsForLead(lead);
  const result = computeTemperature(lead, events);
  return updateLead(lead.id, {
    temperature: result.temperature,
    temperature_score: result.score,
    temperature_reasons: result.reasons
  });
}

function sellerLeadBrief(agent: Agent, lead: Lead) {
  const details = sellerDetails(lead.preferences);
  const location = details?.property_address || details?.neighborhood || agent.market;
  const timeframe = details?.timeframe ? details.timeframe.replaceAll("_", " ") : "timing not specified";
  const name = lead.first_name || "Seller";

  return {
    one_line_summary: `${name} may sell in ${location}`.slice(0, 120),
    why_serious: [
      `Asked ${agent.name} about selling`,
      `Timeline: ${timeframe}`
    ],
    watch_outs: details?.notes ? [`Notes: ${details.notes.slice(0, 120)}`] : ["Confirm property details before advising"],
    suggested_opener: `Hi ${name}, thanks for reaching out about ${location}. I can help you think through timing, prep, and what a realistic sale could look like.`,
    priority: "warm"
  };
}

export async function getMatchReasonMap(leadId: string) {
  if (hasPostgresEnv()) {
    const { rows } = (await query<{ listing_id: string; reason: string }>(
      "select listing_id, reason from lead_match_reasons where lead_id = $1",
      [leadId]
    )) ?? { rows: [] };
    return new Map(rows.map((row) => [row.listing_id, row.reason]));
  }

  return new Map(getDevMatchReasons(leadId).map((row) => [row.listing_id, row.reason]));
}
