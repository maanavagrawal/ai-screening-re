import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/listing-property-search/route";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  lookupPropertyByAddress: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserId: mocks.getCurrentUserId
}));

vi.mock("@/lib/property/lookup", () => ({
  lookupPropertyByAddress: mocks.lookupPropertyByAddress
}));

function jsonRequest(body: unknown) {
  return new Request("https://app.example.com/api/listing-property-search", {
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

describe("listing property search route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserId.mockResolvedValue("user_1");
    mocks.lookupPropertyByAddress.mockResolvedValue({
      propertyDataSource: "fixture",
      normalizedAddress: { label: "123 Maple Street, Austin, TX" },
      propertyFacts: {},
      message: "Property lookup is in fixture mode."
    });
  });

  it("allows a signed-in setup user before an agent row exists", async () => {
    const response = assertResponse(await POST(jsonRequest({ address: "123 Maple Street, Austin, TX" })));

    expect(response.status).toBe(200);
    expect(mocks.lookupPropertyByAddress).toHaveBeenCalledWith("123 Maple Street, Austin, TX", { placeId: undefined });
    await expect(response.json()).resolves.toEqual({
      result: {
        propertyDataSource: "fixture",
        normalizedAddress: { label: "123 Maple Street, Austin, TX" },
        propertyFacts: {},
        message: "Property lookup is in fixture mode."
      }
    });
  });

  it("rejects anonymous lookup requests", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);

    const response = assertResponse(await POST(jsonRequest({ address: "123 Maple Street, Austin, TX" })));

    expect(response.status).toBe(401);
    expect(mocks.lookupPropertyByAddress).not.toHaveBeenCalled();
  });

  it("passes selected Google place IDs into property lookup", async () => {
    const response = assertResponse(
      await POST(jsonRequest({ address: "1233 Laguna Street, San Francisco, CA", placeId: "place-laguna" }))
    );

    expect(response.status).toBe(200);
    expect(mocks.lookupPropertyByAddress).toHaveBeenCalledWith("1233 Laguna Street, San Francisco, CA", {
      placeId: "place-laguna"
    });
  });
});
