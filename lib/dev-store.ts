import { PILOT_AGENTS } from "@/lib/pilot-agents";
import type { Agent, EventRecord, Lead, Listing, Preferences, ShowingRequest } from "@/lib/types";
import type { AgentSetupPayload } from "@/lib/onboard-agent";

type MatchReason = {
  lead_id: string;
  listing_id: string;
  reason: string;
  generated_at: string;
};

type DevStore = {
  agents: Agent[];
  listings: Listing[];
  leads: Lead[];
  events: EventRecord[];
  matchReasons: MatchReason[];
  showingRequests: ShowingRequest[];
  verifyCodes: Map<string, string>;
};

const globalStore = globalThis as typeof globalThis & { __AI_SCREENING_RE_STORE__?: DevStore };

function now() {
  return new Date().toISOString();
}

function toAgent(payload: AgentSetupPayload): Agent {
  return {
    id: crypto.randomUUID(),
    slug: payload.slug,
    name: payload.name,
    headshot_url: payload.headshotUrl,
    bio: payload.bio,
    market: payload.market,
    neighborhoods: payload.neighborhoods,
    phone: payload.phone,
    email: payload.email,
    closed_volume_usd: payload.closedVolumeUsd ?? 0,
    buyers_placed: payload.buyersPlaced ?? 0,
    accent_color: payload.accentColor ?? "#C97B5C",
    created_at: now()
  };
}

function toListings(agent: Agent, payload: AgentSetupPayload): Listing[] {
  return payload.listings.map((listing) => ({
    id: crypto.randomUUID(),
    agent_id: agent.id,
    address: listing.address,
    price: listing.price,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft ?? null,
    neighborhood: listing.neighborhood ?? null,
    property_type: listing.property_type ?? null,
    features: listing.features ?? [],
    deal_breaker_flags: listing.dealBreakerFlags ?? [],
    video_url: listing.videoUrl ?? null,
    video_source: listing.videoSource ?? null,
    description: listing.description ?? null,
    agent_note: listing.agent_note ?? null,
    is_pocket: listing.isPocket ?? false,
    created_at: now()
  }));
}

function createStore(): DevStore {
  const store: DevStore = {
    agents: [],
    listings: [],
    leads: [],
    events: [],
    matchReasons: [],
    showingRequests: [],
    verifyCodes: new Map()
  };

  for (const payload of PILOT_AGENTS) {
    const agent = toAgent(payload);
    store.agents.push(agent);
    store.listings.push(...toListings(agent, payload));
  }

  return store;
}

export function devStore() {
  globalStore.__AI_SCREENING_RE_STORE__ ??= createStore();
  return globalStore.__AI_SCREENING_RE_STORE__;
}

export function upsertDevAgent(payload: AgentSetupPayload) {
  const store = devStore();
  const existing = store.agents.find((agent) => agent.slug === payload.slug);
  if (existing) {
    const leadIds = new Set(
      store.leads.filter((lead) => lead.agent_id === existing.id).map((lead) => lead.id)
    );
    store.listings = store.listings.filter((listing) => listing.agent_id !== existing.id);
    store.leads = store.leads.filter((lead) => lead.agent_id !== existing.id);
    store.events = store.events.filter((event) => event.agent_id !== existing.id);
    store.matchReasons = store.matchReasons.filter((reason) => !leadIds.has(reason.lead_id));
    store.showingRequests = store.showingRequests.filter((request) => !leadIds.has(request.lead_id));
    store.agents = store.agents.filter((agent) => agent.id !== existing.id);
  }

  const agent = toAgent(payload);
  store.agents.push(agent);
  store.listings.push(...toListings(agent, payload));
  return agent;
}

export function getDevAgentBySlug(slug: string) {
  return devStore().agents.find((agent) => agent.slug === slug) ?? null;
}

export function getDevListings(agentId: string) {
  return devStore().listings.filter((listing) => listing.agent_id === agentId);
}

export function getDevListingForAgent(agentId: string, listingId: string) {
  return devStore().listings.find((listing) => listing.agent_id === agentId && listing.id === listingId) ?? null;
}

export function getDevLeadById(leadId: string) {
  return devStore().leads.find((lead) => lead.id === leadId) ?? null;
}

export function getDevLeadForSession(agentId: string, sessionId: string) {
  const leads = devStore().leads.filter(
    (lead) => lead.agent_id === agentId && lead.session_id === sessionId
  );
  return leads.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

export function createDevLead(input: {
  agentId: string;
  sessionId: string;
  firstName?: string | null;
  phone: string;
  email: string;
  preferences: Preferences;
  freeTextRaw?: string | null;
  preapprovalUrl?: string | null;
  tier: Lead["tier"];
}) {
  const lead: Lead = {
    id: crypto.randomUUID(),
    agent_id: input.agentId,
    session_id: input.sessionId,
    first_name: input.firstName ?? null,
    phone: input.phone,
    phone_verified: false,
    email: input.email,
    preferences: input.preferences,
    preapproval_url: input.preapprovalUrl ?? null,
    free_text_raw: input.freeTextRaw ?? null,
    tier: input.tier,
    brief: null,
    created_at: now()
  };

  devStore().leads.push(lead);
  backfillDevEvents(lead);
  return lead;
}

export function updateDevLead(leadId: string, patch: Partial<Lead>) {
  const store = devStore();
  const lead = store.leads.find((item) => item.id === leadId);
  if (!lead) return null;
  Object.assign(lead, patch);
  return lead;
}

export function addDevEvents(events: Array<Omit<EventRecord, "id" | "created_at">>) {
  const rows = events.map((event) => ({
    ...event,
    id: crypto.randomUUID(),
    created_at: now()
  }));
  devStore().events.push(...rows);
  return rows;
}

export function backfillDevEvents(lead: Lead) {
  for (const event of devStore().events) {
    if (event.session_id === lead.session_id && event.agent_id === lead.agent_id && !event.lead_id) {
      event.lead_id = lead.id;
    }
  }
}

export function getDevEventsForLead(lead: Lead) {
  return devStore().events.filter(
    (event) =>
      event.agent_id === lead.agent_id && (event.lead_id === lead.id || event.session_id === lead.session_id)
  );
}

export function upsertDevMatchReasons(rows: MatchReason[]) {
  const store = devStore();
  for (const row of rows) {
    const existing = store.matchReasons.find(
      (item) => item.lead_id === row.lead_id && item.listing_id === row.listing_id
    );
    if (existing) {
      existing.reason = row.reason;
      existing.generated_at = row.generated_at;
    } else {
      store.matchReasons.push(row);
    }
  }
}

export function getDevMatchReasons(leadId: string) {
  return devStore().matchReasons.filter((row) => row.lead_id === leadId);
}

export function setDevVerifyCode(leadId: string, code: string) {
  devStore().verifyCodes.set(leadId, code);
}

export function checkDevVerifyCode(leadId: string, code: string) {
  return devStore().verifyCodes.get(leadId) === code || code === "123456";
}

export function addDevShowingRequest(input: Omit<ShowingRequest, "id" | "created_at" | "status">) {
  const request: ShowingRequest = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending",
    created_at: now()
  };
  devStore().showingRequests.push(request);
  return request;
}
