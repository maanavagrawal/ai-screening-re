import { describe, expect, it } from "vitest";
import { matchScore, normalizePreferences, rankListings } from "@/lib/match-score";
import type { Listing, Preferences } from "@/lib/types";

const listing: Listing = {
  id: "listing-1",
  agent_id: "agent-1",
  address: "123 Test Street",
  price: 700000,
  beds: 3,
  baths: 2,
  sqft: 1800,
  neighborhood: "East Austin",
  property_type: "house",
  features: ["yard", "garage", "home_office"],
  deal_breaker_flags: ["busy_street"],
  video_url: null,
  video_source: null,
  description: null,
  agent_note: null,
  is_pocket: false
};

describe("matchScore", () => {
  it("adds points for budget, beds, baths, neighborhood, and features", () => {
    const preferences: Preferences = {
      budget_min: 650000,
      budget_max: 750000,
      beds: 3,
      baths: 2,
      neighborhoods: ["East Austin"],
      must_haves: ["yard", "garage"]
    };

    expect(matchScore(listing, preferences)).toBe(8);
  });

  it("matches selected area labels from typed location intake", () => {
    expect(
      matchScore(listing, {
        selected_areas: [
          {
            label: "East Austin",
            source: "google_places",
            type: "neighborhood",
            parentLabel: "Austin, TX"
          }
        ]
      })
    ).toBe(1);
  });

  it("subtracts three points per matching deal breaker", () => {
    expect(matchScore(listing, { deal_breakers: ["busy_street"] })).toBe(-3);
  });

  it("does not throw when preferences are sparse", () => {
    expect(matchScore(listing, {})).toBe(0);
  });

  it("scores a budget ceiling without requiring a lower bound", () => {
    expect(matchScore(listing, { budget_max: 750000 })).toBe(2);
  });

  it("merges accepted extraction over raw extraction without dropping missing fields", () => {
    const normalized = normalizePreferences({
      extraction: {
        beds: 3,
        baths: 2,
        budget_min: 650000,
        budget_max: 750000,
        neighborhoods: ["East Austin"],
        must_haves: ["yard"],
        deal_breakers: [],
        family_context: null,
        work_context: null,
        timeline_hint: null,
        financing_hint: null,
        confidence: {
          beds: 0.9,
          baths: 0.9,
          budget_min: 0.9,
          budget_max: 0.9,
          neighborhoods: 0.9,
          must_haves: 0.9,
          deal_breakers: 0,
          family_context: 0,
          work_context: 0,
          timeline_hint: 0,
          financing_hint: 0
        }
      },
      accepted_extraction: {
        must_haves: ["garage"]
      }
    });

    expect(normalized.beds).toBe(3);
    expect(normalized.must_haves).toEqual(["garage"]);
  });
});

describe("rankListings", () => {
  it("filters listings below score three", () => {
    const ranked = rankListings([listing], { beds: 5 });
    expect(ranked).toHaveLength(0);
  });

  it("pins a qualifying pocket listing to position one", () => {
    const pocket = { ...listing, id: "pocket", is_pocket: true, price: 710000 };
    const betterRegular = { ...listing, id: "regular", features: ["yard", "garage", "home_office", "pool"] };
    const ranked = rankListings([betterRegular, pocket], {
      budget_min: 650000,
      budget_max: 750000,
      beds: 3,
      baths: 2,
      neighborhoods: ["East Austin"],
      must_haves: ["yard"]
    });
    expect(ranked[0].listing.id).toBe("pocket");
  });

  it("orders score ties deterministically by price then id", () => {
    const higherPrice = { ...listing, id: "b", price: 725000 };
    const lowerPrice = { ...listing, id: "a", price: 700000 };
    const ranked = rankListings([higherPrice, lowerPrice], {
      beds: 3,
      baths: 2
    });

    expect(ranked.map((item) => item.listing.id)).toEqual(["a", "b"]);
  });
});
