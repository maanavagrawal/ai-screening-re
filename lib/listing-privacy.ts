import type { Listing } from "@/lib/types";

export const BUYER_ADDRESS_PLACEHOLDER = "Exact address shared after showing request";

export type BuyerSafeListing = Pick<
  Listing,
  | "id"
  | "agent_id"
  | "address"
  | "price"
  | "beds"
  | "baths"
  | "sqft"
  | "neighborhood"
  | "property_type"
  | "features"
  | "deal_breaker_flags"
  | "video_url"
  | "video_source"
  | "description"
  | "agent_note"
  | "is_pocket"
  | "created_at"
>;

export type BuyerSafeListingSummary = Omit<BuyerSafeListing, "address"> & {
  location_label: string;
};

export function buyerLocationLabel(listing: Pick<Listing, "neighborhood">) {
  return listing.neighborhood ? `${listing.neighborhood} area` : "Private location";
}

export function redactListingForBuyer(listing: Listing): BuyerSafeListing {
  return {
    id: listing.id,
    agent_id: listing.agent_id,
    address: BUYER_ADDRESS_PLACEHOLDER,
    price: listing.price,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    neighborhood: listing.neighborhood,
    property_type: listing.property_type,
    features: listing.features,
    deal_breaker_flags: listing.deal_breaker_flags,
    video_url: listing.video_url,
    video_source: listing.video_source,
    description: listing.description ? redactKnownListingAddresses(listing.description, [listing]) : null,
    agent_note: listing.agent_note ? redactKnownListingAddresses(listing.agent_note, [listing]) : null,
    is_pocket: listing.is_pocket,
    created_at: listing.created_at
  };
}

export function redactListingsForBuyer(listings: Listing[]): BuyerSafeListing[] {
  return listings.map(redactListingForBuyer);
}

export function buyerSafeListingSummary(listing: Listing): BuyerSafeListingSummary {
  return {
    id: listing.id,
    agent_id: listing.agent_id,
    price: listing.price,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    neighborhood: listing.neighborhood,
    property_type: listing.property_type,
    features: listing.features,
    deal_breaker_flags: listing.deal_breaker_flags,
    video_url: listing.video_url,
    video_source: listing.video_source,
    description: listing.description ? redactKnownListingAddresses(listing.description, [listing]) : null,
    agent_note: listing.agent_note ? redactKnownListingAddresses(listing.agent_note, [listing]) : null,
    is_pocket: listing.is_pocket,
    created_at: listing.created_at,
    location_label: buyerLocationLabel(listing)
  };
}

export function redactKnownListingAddresses(text: string, listings: Array<Pick<Listing, "address" | "neighborhood">>) {
  return listings.reduce((current, listing) => {
    if (!listing.address.trim()) return current;
    return current.replace(new RegExp(escapeRegExp(listing.address), "gi"), buyerLocationLabel(listing));
  }, text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
