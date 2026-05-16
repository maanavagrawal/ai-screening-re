import { PILOT_AGENTS } from "@/lib/pilot-agents";
import type {
  Agent,
  AgentSetupDraftData,
  EventRecord,
  Lead,
  Listing,
  NotificationPreferences,
  Preferences,
  SetupDraft,
  ShowingRequest
} from "@/lib/types";
import type { AgentSetupPayload } from "@/lib/onboard-agent";
import { enrichmentToRow } from "@/lib/listing-enrichment";

type MatchReason = {
  lead_id: string;
  listing_id: string;
  reason: string;
  generated_at: string;
};

type DistributionCache = {
  agent_id: string;
  data: Record<string, unknown>;
  updated_at: string;
};

type DevStore = {
  agents: Agent[];
  listings: Listing[];
  leads: Lead[];
  events: EventRecord[];
  matchReasons: MatchReason[];
  showingRequests: ShowingRequest[];
  verifyCodes: Map<string, string>;
  agentVerifyCodes: Map<string, string>;
  setupDrafts: SetupDraft[];
  distributionCache: DistributionCache[];
};

const globalStore = globalThis as typeof globalThis & { __AI_SCREENING_RE_STORE__?: DevStore };

function now() {
  return new Date().toISOString();
}

function toAgent(payload: AgentSetupPayload): Agent {
  return {
    id: crypto.randomUUID(),
    user_id: payload.userId ?? null,
    slug: payload.slug,
    name: payload.name,
    headshot_url: payload.headshotUrl,
    bio: payload.bio,
    headline: payload.headline ?? null,
    sub_headline: payload.subHeadline ?? null,
    voice_notes: payload.voiceNotes ?? null,
    market: payload.market,
    neighborhoods: payload.neighborhoods,
    phone: payload.phone,
    email: payload.email,
    closed_volume_usd: payload.closedVolumeUsd ?? 0,
    buyers_placed: payload.buyersPlaced ?? 0,
    accent_color: payload.accentColor ?? "#C97B5C",
    paused: payload.paused ?? false,
    notification_preferences: normalizeNotificationPreferences(payload.notificationPreferences),
    created_at: now()
  };
}

export function normalizeNotificationPreferences(
  input?: Partial<NotificationPreferences> | null
): NotificationPreferences {
  return {
    new_lead: input?.new_lead ?? false,
    showing_requested: input?.showing_requested ?? true,
    hot_lead: input?.hot_lead ?? true,
    weekly_summary: input?.weekly_summary ?? false
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
    ...enrichmentToRow({
      attomId: listing.attomId ?? null,
      propertyDataSource: listing.propertyDataSource ?? null,
      propertyEnrichedAt: listing.propertyEnrichedAt ?? null,
      propertyMatchConfidence: listing.propertyMatchConfidence ?? null,
      normalizedAddress: listing.normalizedAddress ?? null,
      propertyFacts: listing.propertyFacts ?? null,
      propertyOverrideFields: listing.propertyOverrideFields ?? []
    }),
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
    verifyCodes: new Map(),
    agentVerifyCodes: new Map(),
    setupDrafts: [],
    distributionCache: []
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

export function getDevAgentByUserId(userId: string) {
  return devStore().agents.find((agent) => agent.user_id === userId) ?? null;
}

export function getFirstDevAgent() {
  return devStore().agents[0] ?? null;
}

export function updateDevAgent(agentId: string, patch: Partial<Agent>) {
  const agent = devStore().agents.find((item) => item.id === agentId);
  if (!agent) return null;
  Object.assign(agent, patch);
  return agent;
}

export function getDevListings(agentId: string) {
  return devStore().listings.filter((listing) => listing.agent_id === agentId);
}

export function createDevListing(agentId: string, listing: AgentSetupPayload["listings"][number]) {
  const row: Listing = {
    id: crypto.randomUUID(),
    agent_id: agentId,
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
    ...enrichmentToRow({
      attomId: listing.attomId ?? null,
      propertyDataSource: listing.propertyDataSource ?? null,
      propertyEnrichedAt: listing.propertyEnrichedAt ?? null,
      propertyMatchConfidence: listing.propertyMatchConfidence ?? null,
      normalizedAddress: listing.normalizedAddress ?? null,
      propertyFacts: listing.propertyFacts ?? null,
      propertyOverrideFields: listing.propertyOverrideFields ?? []
    }),
    created_at: now()
  };
  devStore().listings.unshift(row);
  return row;
}

export function updateDevListing(agentId: string, listingId: string, patch: Partial<Listing>) {
  const listing = devStore().listings.find((item) => item.agent_id === agentId && item.id === listingId);
  if (!listing) return null;
  Object.assign(listing, patch);
  return listing;
}

export function deleteDevListing(agentId: string, listingId: string) {
  const store = devStore();
  const before = store.listings.length;
  store.listings = store.listings.filter((listing) => !(listing.agent_id === agentId && listing.id === listingId));
  return store.listings.length < before;
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

export function getDevLeadsForAgent(agentId: string) {
  return devStore().leads.filter((lead) => lead.agent_id === agentId);
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
    temperature: null,
    temperature_score: null,
    temperature_reasons: [],
    last_contacted_at: null,
    snoozed_until: null,
    marked_junk: false,
    notes: null,
    source: typeof input.preferences.source === "string" ? input.preferences.source : "direct",
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

export function upsertDevSetupDraft(input: {
  userId: string;
  data: Partial<AgentSetupDraftData>;
  currentStep: string;
}) {
  const store = devStore();
  const existing = store.setupDrafts.find((draft) => draft.user_id === input.userId);
  if (existing) {
    existing.data = { ...existing.data, ...input.data };
    existing.current_step = input.currentStep;
    existing.updated_at = now();
    return existing;
  }

  const draft: SetupDraft = {
    id: crypto.randomUUID(),
    user_id: input.userId,
    data: input.data,
    current_step: input.currentStep,
    created_at: now(),
    updated_at: now()
  };
  store.setupDrafts.push(draft);
  return draft;
}

export function getDevSetupDraft(userId: string) {
  return devStore().setupDrafts.find((draft) => draft.user_id === userId) ?? null;
}

export function setDevAgentVerifyCode(userId: string, code: string) {
  devStore().agentVerifyCodes.set(userId, code);
}

export function checkDevAgentVerifyCode(userId: string, code: string) {
  return devStore().agentVerifyCodes.get(userId) === code || code === "123456";
}

export function getDevDistributionCache(agentId: string) {
  return devStore().distributionCache.find((cache) => cache.agent_id === agentId) ?? null;
}

export function setDevDistributionCache(agentId: string, data: Record<string, unknown>) {
  const store = devStore();
  const existing = store.distributionCache.find((cache) => cache.agent_id === agentId);
  if (existing) {
    existing.data = data;
    existing.updated_at = now();
    return existing;
  }
  const cache = { agent_id: agentId, data, updated_at: now() };
  store.distributionCache.push(cache);
  return cache;
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

export function getDevEventsForAgent(agentId: string) {
  return devStore().events.filter((event) => event.agent_id === agentId);
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
