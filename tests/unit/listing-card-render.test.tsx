import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListingCard } from "@/components/matches/listing-card";
import type { Agent, Listing } from "@/lib/types";

const agent: Agent = {
  id: "agent-1",
  slug: "maya",
  name: "Maya Chen",
  headshot_url: null,
  bio: null,
  market: "San Ramon, CA",
  neighborhoods: ["San Ramon"],
  phone: null,
  email: "maya@example.com",
  closed_volume_usd: 0,
  buyers_placed: 0,
  accent_color: "#C97B5C"
};

const listing: Listing = {
  id: "listing-1",
  agent_id: "agent-1",
  address: "Neighborhood-level location",
  price: 2500000,
  beds: 4,
  baths: 3,
  sqft: 2600,
  neighborhood: "San Ramon",
  property_type: "house",
  features: ["yard"],
  deal_breaker_flags: [],
  video_url: "https://www.instagram.com/reel/example/",
  video_source: "instagram",
  description: null,
  agent_note: null,
  is_pocket: false
};

describe("ListingCard social media state", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses social-specific footer copy when an Instagram CTA is present", () => {
    vi.stubGlobal("React", React);

    render(
      <ListingCard
        agent={agent}
        listing={listing}
        reason="Great fit for the buyer."
        score={6}
        onDismiss={vi.fn()}
        onRequest={vi.fn()}
      />
    );

    expect(screen.getByRole("link", { name: /Watch on Instagram/i })).toBeTruthy();
    expect(screen.getByText("Open Instagram to watch the agent's video.")).toBeTruthy();
    expect(screen.queryByText("Real media coming soon.")).toBeNull();
  });
});
