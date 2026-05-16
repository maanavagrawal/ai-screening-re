import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "@/app/api/dashboard/listings/[id]/route";
import { POST } from "@/app/api/dashboard/listings/route";
import type { Agent, Listing } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  getCurrentAgent: vi.fn(),
  createListingForAgent: vi.fn(),
  getListingsForAgent: vi.fn(),
  updateListingForAgent: vi.fn(),
  deleteListingForAgent: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentAgent: mocks.getCurrentAgent
}));

vi.mock("@/lib/listings", () => ({
  createListingForAgent: mocks.createListingForAgent,
  getListingsForAgent: mocks.getListingsForAgent,
  updateListingForAgent: mocks.updateListingForAgent,
  deleteListingForAgent: mocks.deleteListingForAgent
}));

const agent: Agent = {
  id: "agent_1",
  user_id: "user_1",
  slug: "elena",
  name: "Elena Ruiz",
  headshot_url: null,
  bio: null,
  market: "Denver, CO",
  neighborhoods: ["LoHi"],
  phone: null,
  email: "elena@example.com",
  closed_volume_usd: 0,
  buyers_placed: 0,
  accent_color: "#C97B5C"
};

const listing: Listing = {
  id: "listing_1",
  agent_id: "agent_1",
  address: "123 Maple Street",
  price: 735000,
  beds: 3,
  baths: 2,
  sqft: 1800,
  neighborhood: "LoHi",
  property_type: "house",
  features: ["yard"],
  deal_breaker_flags: ["busy_street"],
  video_url: null,
  video_source: null,
  description: "Bright LoHi home.",
  agent_note: "Easy to show.",
  is_pocket: false
};

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function params(id = "listing_1") {
  return { params: Promise.resolve({ id }) };
}

function assertResponse(response: Response | undefined): Response {
  expect(response).toBeDefined();
  if (!response) throw new Error("Expected response");
  return response;
}

describe("dashboard listing routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentAgent.mockResolvedValue(agent);
    mocks.createListingForAgent.mockResolvedValue(listing);
    mocks.updateListingForAgent.mockResolvedValue({ ...listing, price: 750000 });
    mocks.deleteListingForAgent.mockResolvedValue(true);
  });

  it("creates listings for the signed-in agent", async () => {
    const response = await POST(jsonRequest("https://app.example.com/api/dashboard/listings", {
      address: "123 Maple Street",
      price: 735000,
      beds: 3,
      baths: 2,
      sqft: 1800,
      neighborhood: "LoHi",
      property_type: "house",
      features: ["yard"],
      dealBreakerFlags: ["busy_street"],
      description: "Bright LoHi home.",
      agent_note: "Easy to show.",
      isPocket: false
    }));

    const result = assertResponse(response);
    expect(result.status).toBe(200);
    expect(mocks.createListingForAgent).toHaveBeenCalledWith("agent_1", expect.objectContaining({
      address: "123 Maple Street",
      features: ["yard"],
      dealBreakerFlags: ["busy_street"]
    }));
    expect(await result.json()).toEqual({ listing });
  });

  it("patches listings through the current agent scope", async () => {
    const response = await PATCH(jsonRequest("https://app.example.com/api/dashboard/listings/listing_1", {
      price: 750000,
      features: ["yard", "home_office"],
      isPocket: true
    }), params());

    const result = assertResponse(response);
    expect(result.status).toBe(200);
    expect(mocks.updateListingForAgent).toHaveBeenCalledWith("agent_1", "listing_1", {
      price: 750000,
      features: ["yard", "home_office"],
      isPocket: true
    });
    expect(await result.json()).toEqual({ listing: { ...listing, price: 750000 } });
  });

  it("returns 404 when a scoped listing patch misses", async () => {
    mocks.updateListingForAgent.mockResolvedValue(null);

    const response = await PATCH(jsonRequest("https://app.example.com/api/dashboard/listings/listing_404", {
      price: 750000
    }), params("listing_404"));

    const result = assertResponse(response);
    expect(result.status).toBe(404);
    expect(await result.json()).toEqual({ error: "Listing not found" });
  });

  it("returns 404 when delete does not find an agent-owned listing", async () => {
    mocks.deleteListingForAgent.mockResolvedValue(false);

    const response = await DELETE(new Request("https://app.example.com/api/dashboard/listings/listing_404", {
      method: "DELETE"
    }), params("listing_404"));

    const result = assertResponse(response);
    expect(mocks.deleteListingForAgent).toHaveBeenCalledWith("agent_1", "listing_404");
    expect(result.status).toBe(404);
    expect(await result.json()).toEqual({ error: "Listing not found" });
  });

  it("rejects listing management when no agent is signed in", async () => {
    mocks.getCurrentAgent.mockResolvedValue(null);

    const response = await DELETE(new Request("https://app.example.com/api/dashboard/listings/listing_1", {
      method: "DELETE"
    }), params());

    const result = assertResponse(response);
    expect(result.status).toBe(401);
    expect(await result.json()).toEqual({ error: "Not signed in" });
    expect(mocks.deleteListingForAgent).not.toHaveBeenCalled();
  });
});
