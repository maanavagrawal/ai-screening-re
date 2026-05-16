import { describe, expect, it } from "vitest";
import {
  BUYER_ADDRESS_PLACEHOLDER,
  buyerSafeListingSummary,
  redactKnownListingAddresses,
  redactListingForBuyer
} from "@/lib/listing-privacy";
import type { Listing } from "@/lib/types";

const listing: Listing = {
  id: "listing-1",
  agent_id: "agent-1",
  address: "1811 Willow Creek Drive",
  price: 725000,
  beds: 3,
  baths: 2,
  sqft: 1850,
  neighborhood: "East Austin",
  property_type: "house",
  features: ["yard"],
  deal_breaker_flags: [],
  video_url: null,
  video_source: null,
  description: "A bright East Austin home.",
  agent_note: "Easy fit for buyers who want East Austin.",
  is_pocket: false,
  attom_id: "123456",
  property_data_source: "attom",
  property_enriched_at: "2026-05-14T00:00:00.000Z",
  property_match_confidence: 0.95,
  normalized_address: {
    line1: "1811 Willow Creek Drive",
    city: "Austin",
    state: "TX",
    postalCode: "78702",
    label: "1811 Willow Creek Drive, Austin, TX 78702"
  },
  property_facts: {
    beds: 3,
    baths: 2,
    sqft: 1850,
    propertyType: "Single Family"
  },
  property_override_fields: [],
  created_at: "2026-05-14T00:00:00.000Z"
};

describe("listing privacy", () => {
  it("redacts exact addresses from buyer listing payloads", () => {
    const redacted = redactListingForBuyer(listing);

    expect(redacted.address).toBe(BUYER_ADDRESS_PLACEHOLDER);
    expect(redacted.id).toBe(listing.id);
    expect(redacted.neighborhood).toBe("East Austin");
    expect("attom_id" in redacted).toBe(false);
    expect("normalized_address" in redacted).toBe(false);
    expect("property_facts" in redacted).toBe(false);
  });

  it("creates prompt summaries without address or enrichment fields", () => {
    const summary = buyerSafeListingSummary(listing);

    expect(summary.location_label).toBe("East Austin area");
    expect("address" in summary).toBe(false);
    expect("attom_id" in summary).toBe(false);
    expect("normalized_address" in summary).toBe(false);
    expect("property_facts" in summary).toBe(false);
  });

  it("scrubs old generated buyer copy that contains exact addresses", () => {
    const text = "1811 Willow Creek Drive fits your East Austin search and has the yard you wanted.";

    expect(redactKnownListingAddresses(text, [listing])).toBe(
      "East Austin area fits your East Austin search and has the yard you wanted."
    );
  });
});
