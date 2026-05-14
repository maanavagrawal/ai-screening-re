import type { Agent, EventRecord, Listing } from "@/lib/types";

export function agentBaseUrl(agent: Agent, origin?: string) {
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
  const base = process.env.NEXT_PUBLIC_APP_URL || origin || browserOrigin || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${agent.slug}`;
}

export function humanEvent(event: EventRecord, listings: Listing[] = []) {
  const listingId = typeof event.metadata.listing_id === "string" ? event.metadata.listing_id : null;
  const listing = listingId ? listings.find((item) => item.id === listingId) : null;
  const labels: Record<string, string> = {
    intake_started: "Started intake",
    intake_question_answered: "Answered intake question",
    intake_free_text_submitted: "Shared what they want",
    intake_completed: "Completed intake",
    contact_gate_viewed: "Reached contact gate",
    lead_created: "Lead created",
    listing_viewed: "Viewed listing",
    listing_video_replayed: "Replayed listing video",
    listing_dismissed: "Dismissed listing",
    showing_sheet_opened: "Opened showing request",
    showing_verification_started: "Started phone verification",
    showing_verification_completed: "Verified phone",
    showing_verification_abandoned: "Abandoned verification",
    abandoned_showing_request: "Abandoned showing request",
    showing_request_submitted: "Requested showing",
    returned_to_matches: "Returned to matches",
    lead_marked_contacted: "Marked contacted",
    lead_snoozed: "Snoozed lead",
    lead_marked_junk: "Marked junk"
  };
  return listing ? `${labels[event.event_type] ?? event.event_type} • ${listing.address}` : labels[event.event_type] ?? event.event_type;
}
