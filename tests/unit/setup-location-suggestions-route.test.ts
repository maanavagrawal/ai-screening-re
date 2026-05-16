import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/setup/location-suggestions/route";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  searchLocationSuggestions: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserId: mocks.getCurrentUserId
}));

vi.mock("@/lib/location/search", () => ({
  searchLocationSuggestions: mocks.searchLocationSuggestions
}));

function request(body: unknown) {
  return new Request("https://app.example.com/api/setup/location-suggestions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function assertResponse(response: Response | undefined): Response {
  expect(response).toBeDefined();
  if (!response) throw new Error("Expected response");
  return response;
}

describe("/api/setup/location-suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserId.mockResolvedValue("user_123");
    mocks.searchLocationSuggestions.mockResolvedValue([
      {
        label: "San Ramon",
        placeId: "place-san-ramon",
        source: "google_places",
        type: "city",
        parentLabel: "California, USA"
      }
    ]);
  });

  it("returns market-biased location suggestions for setup users", async () => {
    const response = assertResponse(await POST(request({
      query: "San",
      market: "San Francisco, CA",
      neighborhoods: ["Oakland"]
    })));

    expect(response.status).toBe(200);
    expect(mocks.searchLocationSuggestions).toHaveBeenCalledWith({
      query: "San",
      providerQuery: "San, San Francisco, CA",
      agent: {
        market: "San Francisco, CA",
        neighborhoods: ["Oakland"]
      },
      listings: []
    });
    await expect(response.json()).resolves.toEqual({
      suggestions: [
        {
          label: "San Ramon",
          placeId: "place-san-ramon",
          source: "google_places",
          type: "city",
          parentLabel: "California, USA"
        }
      ]
    });
  });

  it("rejects anonymous setup location suggestions", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);

    const response = assertResponse(await POST(request({ query: "San", market: "San Francisco, CA" })));

    expect(response.status).toBe(401);
    expect(mocks.searchLocationSuggestions).not.toHaveBeenCalled();
  });
});
