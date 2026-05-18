import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/matches/[leadId]/route";
import { BUYER_ADDRESS_PLACEHOLDER } from "@/lib/listing-privacy";
import { LEAD_COOKIE, SESSION_COOKIE } from "@/lib/session";
import type { Agent, Lead, Listing, Preferences } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  findLeadById: vi.fn(),
  getListingsForAgent: vi.fn(),
  getMatchReasonMap: vi.fn(),
  resolveAgent: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies
}));

vi.mock("@/lib/leads", () => ({
  findLeadById: mocks.findLeadById,
  getMatchReasonMap: mocks.getMatchReasonMap
}));

vi.mock("@/lib/listings", () => ({
  getListingsForAgent: mocks.getListingsForAgent
}));

vi.mock("@/lib/resolve-agent", () => ({
  resolveAgent: mocks.resolveAgent
}));

const agent: Agent = {
  id: "agent-1",
  slug: "maya",
  name: "Maya Chen",
  headshot_url: null,
  bio: "Austin advisor",
  market: "Austin, TX",
  neighborhoods: ["East Austin"],
  phone: "+15125550100",
  email: "maya@example.com",
  closed_volume_usd: 0,
  buyers_placed: 0,
  accent_color: "#C97B5C"
};

function listing(patch: Partial<Listing>): Listing {
  return {
    id: "listing-1",
    agent_id: agent.id,
    address: "1811 Willow Creek Drive",
    price: 700000,
    beds: 3,
    baths: 2,
    sqft: 1800,
    neighborhood: "East Austin",
    property_type: "house",
    features: ["yard"],
    deal_breaker_flags: [],
    video_url: null,
    video_source: null,
    description: null,
    agent_note: null,
    is_pocket: false,
    ...patch
  };
}

function lead(preferences: Preferences): Lead {
  return {
    id: "lead-1",
    agent_id: agent.id,
    session_id: "session-1",
    first_name: "Sarah",
    phone: "+15125550123",
    phone_verified: false,
    email: "sarah@example.com",
    preferences,
    preapproval_url: null,
    free_text_raw: null,
    tier: "captured",
    brief: null,
    created_at: "2026-05-17T00:00:00.000Z"
  };
}

async function callMatchesRoute() {
  return GET(new Request("https://app.example.com/api/matches/lead-1?agent_slug=maya"), {
    params: Promise.resolve({ leadId: "lead-1" })
  });
}

describe("/api/matches/[leadId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAgent.mockResolvedValue(agent);
    mocks.cookies.mockResolvedValue({
      get: (name: string) => {
        if (name === LEAD_COOKIE) return { value: "lead-1" };
        if (name === SESSION_COOKIE) return { value: "session-1" };
        return undefined;
      }
    });
    mocks.getMatchReasonMap.mockResolvedValue(new Map());
  });

  it("returns recommended matches and all agent listings when a recommendation exists", async () => {
    const strongFit = listing({ id: "strong", address: "1811 Willow Creek Drive" });
    const weakFit = listing({
      id: "weak",
      address: "5204 Berkman Terrace",
      price: 1200000,
      beds: 1,
      baths: 1,
      neighborhood: "Westlake",
      features: []
    });
    mocks.findLeadById.mockResolvedValue(
      lead({
        budget_max: 750000,
        beds: 3,
        baths: 2,
        neighborhoods: ["East Austin"],
        must_haves: ["yard"]
      })
    );
    mocks.getListingsForAgent.mockResolvedValue([strongFit, weakFit]);
    mocks.getMatchReasonMap.mockResolvedValue(
      new Map([["strong", "1811 Willow Creek Drive has the yard and East Austin fit Sarah wanted."]])
    );

    const response = await callMatchesRoute();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.defaultTab).toBe("recommended");
    expect(payload.recommendedMatches).toHaveLength(1);
    expect(payload.allMatches).toHaveLength(2);
    expect(payload.matches).toHaveLength(1);
    expect(payload.recommendedMatches[0].listing.address).toBe(BUYER_ADDRESS_PLACEHOLDER);
    expect(payload.recommendedMatches[0].match_reason).not.toContain("1811 Willow Creek Drive");
  });

  it("defaults to all listings when no agent listings meet the recommendation threshold", async () => {
    const first = listing({ id: "first", address: "1811 Willow Creek Drive" });
    const second = listing({
      id: "second",
      address: "5204 Berkman Terrace",
      price: 1200000,
      beds: 1,
      baths: 1,
      neighborhood: "Westlake",
      features: []
    });
    mocks.findLeadById.mockResolvedValue(lead({ budget_max: 300000, beds: 5, baths: 4 }));
    mocks.getListingsForAgent.mockResolvedValue([first, second]);

    const response = await callMatchesRoute();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.defaultTab).toBe("all");
    expect(payload.recommendedMatches).toHaveLength(0);
    expect(payload.allMatches).toHaveLength(2);
    expect(payload.matches).toHaveLength(2);
    expect(payload.allMatches.map((match: { listing: Listing }) => match.listing.address)).toEqual([
      BUYER_ADDRESS_PLACEHOLDER,
      BUYER_ADDRESS_PLACEHOLDER
    ]);
  });
});
