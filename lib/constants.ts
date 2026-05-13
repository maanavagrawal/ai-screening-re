export const DEFAULT_ACCENT = "#C97B5C";

export const MUST_HAVES = [
  "yard",
  "garage",
  "pool",
  "home_office",
  "updated_kitchen",
  "open_floor_plan",
  "walkable",
  "quiet_street",
  "new_construction"
] as const;

export const DEAL_BREAKERS = [
  "hoa",
  "fixer_upper",
  "busy_street",
  "long_commute",
  "shared_walls"
] as const;

export const EVENT_TYPES = [
  "intake_started",
  "intake_question_answered",
  "intake_free_text_submitted",
  "intake_extraction_edited",
  "intake_abandoned",
  "intake_completed",
  "preapproval_uploaded",
  "preapproval_skipped",
  "contact_gate_viewed",
  "phone_submitted",
  "email_submitted",
  "lead_created",
  "listing_viewed",
  "listing_video_replayed",
  "listing_dismissed",
  "match_reason_expanded",
  "showing_sheet_opened",
  "showing_verification_started",
  "showing_verification_completed",
  "showing_verification_abandoned",
  "abandoned_showing_request",
  "showing_request_submitted",
  "returned_to_matches",
  "returning_visitor_landing"
] as const;

export const QUESTION_ORDER = [
  "timeline",
  "free_text",
  "current_situation",
  "financing",
  "preapproval_upload",
  "financing_help",
  "budget",
  "bedrooms",
  "bathrooms",
  "property_type",
  "neighborhoods",
  "must_haves",
  "deal_breakers",
  "first_time_buyer",
  "anything_else"
] as const;
