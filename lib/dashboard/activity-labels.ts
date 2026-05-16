import { buyerLocationLabel } from "@/lib/listing-privacy";
import type { EventRecord, Listing } from "@/lib/types";

const EVENT_LABELS: Record<string, string> = {
  intake_started: "Started intake",
  intake_question_answered: "Answered intake question",
  intake_free_text_submitted: "Shared what they want",
  intake_extraction_edited: "Edited extracted preferences",
  intake_abandoned: "Left intake before contact",
  intake_completed: "Completed intake",
  contact_gate_viewed: "Reached contact gate",
  phone_submitted: "Submitted phone",
  email_submitted: "Submitted email",
  lead_created: "Lead created",
  listing_viewed: "Viewed listing",
  listing_video_replayed: "Replayed listing video",
  listing_dismissed: "Dismissed listing",
  match_reason_expanded: "Expanded match reason",
  showing_sheet_opened: "Opened showing request",
  showing_verification_started: "Started phone verification",
  showing_verification_completed: "Verified phone",
  showing_verification_abandoned: "Abandoned verification",
  abandoned_showing_request: "Abandoned showing request",
  showing_request_submitted: "Requested showing",
  returned_to_matches: "Returned to matches",
  returning_visitor_landing: "Returned to buyer page",
  seller_inquiry_created: "Seller inquiry created",
  lead_marked_contacted: "Marked contacted",
  lead_snoozed: "Snoozed lead",
  lead_marked_junk: "Marked junk"
};

export function humanEvent(event: EventRecord, listings: Listing[] = []) {
  const listingId = typeof event.metadata.listing_id === "string" ? event.metadata.listing_id : null;
  const listing = listingId ? listings.find((item) => item.id === listingId) : null;
  const baseLabel = EVENT_LABELS[event.event_type] ?? event.event_type.replaceAll("_", " ");
  return listing ? `${baseLabel} - ${buyerLocationLabel(listing)}` : baseLabel;
}
