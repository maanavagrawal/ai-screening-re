import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/listing-address-suggestions/route";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  searchListingAddressSuggestions: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserId: mocks.getCurrentUserId
}));

vi.mock("@/lib/property/lookup", () => ({
  searchListingAddressSuggestions: mocks.searchListingAddressSuggestions
}));

function jsonRequest(body: unknown) {
  return new Request("https://app.example.com/api/listing-address-suggestions", {
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

describe("listing address suggestions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserId.mockResolvedValue("user_1");
    mocks.searchListingAddressSuggestions.mockResolvedValue([
      {
        label: "24 Lakeview Lane, Denver, CO 80211",
        placeId: "place-1",
        secondaryLabel: "Denver, CO 80211",
        source: "google_places"
      }
    ]);
  });

  it("returns address suggestions for signed-in agents", async () => {
    const response = assertResponse(await POST(jsonRequest({ query: "24 lake" })));

    expect(response.status).toBe(200);
    expect(mocks.searchListingAddressSuggestions).toHaveBeenCalledWith("24 lake");
    await expect(response.json()).resolves.toEqual({
      suggestions: [
        {
          label: "24 Lakeview Lane, Denver, CO 80211",
          placeId: "place-1",
          secondaryLabel: "Denver, CO 80211",
          source: "google_places"
        }
      ]
    });
  });

  it("rejects anonymous address suggestion requests", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);

    const response = assertResponse(await POST(jsonRequest({ query: "24 lake" })));

    expect(response.status).toBe(401);
    expect(mocks.searchListingAddressSuggestions).not.toHaveBeenCalled();
  });
});
