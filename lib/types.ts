export type Agent = {
  id: string;
  user_id?: string | null;
  slug: string;
  name: string;
  headshot_url: string | null;
  bio: string | null;
  headline?: string | null;
  sub_headline?: string | null;
  voice_notes?: string | null;
  market: string;
  neighborhoods: string[];
  phone: string | null;
  email: string | null;
  closed_volume_usd: number;
  buyers_placed: number;
  accent_color: string | null;
  paused?: boolean;
  notification_preferences?: NotificationPreferences;
  created_at?: string;
};

export type Listing = {
  id: string;
  agent_id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number | null;
  neighborhood: string | null;
  property_type: string | null;
  features: string[];
  deal_breaker_flags: string[];
  video_url: string | null;
  video_source: "instagram" | "tiktok" | "mp4" | null;
  description: string | null;
  agent_note: string | null;
  is_pocket: boolean;
  attom_id?: string | null;
  property_data_source?: "attom" | "manual" | "fixture" | null;
  property_enriched_at?: string | null;
  property_match_confidence?: number | null;
  normalized_address?: NormalizedAddress | null;
  property_facts?: PropertyFacts | null;
  property_override_fields?: string[] | null;
  created_at?: string;
};

export type Lead = {
  id: string;
  agent_id: string;
  session_id: string;
  first_name: string | null;
  phone: string;
  phone_verified: boolean;
  email: string;
  preferences: Preferences;
  preapproval_url: string | null;
  free_text_raw: string | null;
  tier: "captured" | "engaged" | "requested_showing" | "browsing";
  temperature?: "hot" | "warm" | "browsing" | null;
  temperature_score?: number | null;
  temperature_reasons?: string[] | null;
  last_contacted_at?: string | null;
  snoozed_until?: string | null;
  marked_junk?: boolean;
  notes?: string | null;
  source?: string | null;
  brief: unknown | null;
  created_at: string;
};

export type EventRecord = {
  id: string;
  session_id: string;
  lead_id: string | null;
  agent_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Preferences = {
  intent?: "buyer" | "seller";
  seller?: {
    property_address?: string | null;
    neighborhood?: string | null;
    timeframe?: "asap" | "1_3_months" | "3_6_months" | "6_plus_months" | "just_curious" | "custom";
    notes?: string | null;
  };
  timeline?: {
    preset: "30_days" | "60_days" | "90_days" | "6_months" | "just_exploring" | "custom";
    target_date?: string | null;
  };
  free_text_raw?: string;
  extraction?: FreeTextExtraction;
  accepted_extraction?: Partial<FreeTextExtraction>;
  current_situation?: {
    status: "renting" | "own_plan_to_sell" | "own_keeping" | "family_or_other";
    lease_end_date?: string | null;
  };
  financing?: "pre_approved" | "in_process" | "cash_buyer" | "not_started";
  preapproval_url?: string;
  financing_help?: "yes_connect_lender" | "no";
  budget_min?: number;
  budget_max?: number;
  beds?: number;
  baths?: number;
  bedrooms?: "1" | "2" | "3" | "4" | "5_plus";
  bathrooms?: "1" | "2" | "3" | "4_plus";
  property_category?: "single_family" | "multi_family" | "both";
  single_family_property_type?: string[];
  multifamily_property_type?: string[];
  property_type?: string[];
  neighborhoods?: string[];
  selected_areas?: SelectedArea[];
  open_to_suggestions?: boolean;
  must_haves?: string[];
  deal_breakers?: string[];
  first_time_buyer?: boolean;
  anything_else?: string;
  tier_hint?: "captured" | "browsing";
  answered_question_ids?: string[];
  source?: string;
};

export type SelectedArea = {
  label: string;
  placeId?: string | null;
  source: "google_places" | "manual" | "agent_suggestion";
  type: "city" | "neighborhood" | "postal_code" | "school_district" | "region" | "custom";
  parentLabel?: string | null;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  coarseCenter?: {
    latitude: number;
    longitude: number;
  } | null;
};

export type NormalizedAddress = {
  line1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  label?: string | null;
};

export type PropertyFacts = {
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  propertyType?: string | null;
  yearBuilt?: number | null;
  lotSizeSqft?: number | null;
  stories?: number | null;
  parking?: string | null;
  assessedValue?: number | null;
  taxAnnualAmount?: number | null;
  sourceUpdatedAt?: string | null;
};

export type FreeTextExtraction = {
  beds: number | null;
  baths: number | null;
  budget_min: number | null;
  budget_max: number | null;
  neighborhoods: string[];
  must_haves: string[];
  deal_breakers: string[];
  family_context: string | null;
  work_context: string | null;
  timeline_hint: string | null;
  financing_hint: string | null;
  confidence: Record<string, number>;
};

export type ListingPayload = {
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft?: number | null;
  neighborhood?: string | null;
  property_type?: string | null;
  features?: string[];
  dealBreakerFlags?: string[];
  videoUrl?: string | null;
  videoSource?: "instagram" | "tiktok" | "mp4" | null;
  description?: string | null;
  agent_note?: string | null;
  isPocket?: boolean;
  attomId?: string | null;
  propertyDataSource?: Listing["property_data_source"];
  propertyEnrichedAt?: string | null;
  propertyMatchConfidence?: number | null;
  normalizedAddress?: NormalizedAddress | null;
  propertyFacts?: PropertyFacts | null;
  propertyOverrideFields?: string[] | null;
};

export type ShowingRequest = {
  id: string;
  lead_id: string;
  listing_id: string;
  preferred_date: string | null;
  preferred_time_of_day: "morning" | "afternoon" | "evening" | null;
  note: string | null;
  status: string;
  created_at: string;
};

export type NotificationPreferences = {
  new_lead: boolean;
  showing_requested: boolean;
  hot_lead: boolean;
  weekly_summary: boolean;
};

export type SetupDraft = {
  id: string;
  user_id: string;
  data: Partial<AgentSetupDraftData>;
  current_step: string;
  created_at: string;
  updated_at: string;
};

export type AgentSetupDraftData = {
  userId?: string;
  slug?: string;
  name?: string;
  market?: string;
  neighborhoods?: string[];
  headshotUrl?: string;
  bio?: string;
  headline?: string;
  subHeadline?: string;
  voiceNotes?: string;
  voiceRaw?: string;
  phone?: string;
  phoneVerified?: boolean;
  email?: string;
  accentColor?: string;
  notificationPreferences?: Partial<NotificationPreferences>;
  listings?: ListingPayload[];
};

export type DashboardLead = Lead & {
  last_activity_at: string;
  events: EventRecord[];
  showing_requests: ShowingRequest[];
};
