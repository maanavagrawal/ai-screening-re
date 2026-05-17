import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fixturePropertyLookup,
  lookupPropertyByAddress,
  normalizeAttomProperty,
  searchListingAddressSuggestions
} from "@/lib/property/lookup";

describe("property lookup normalization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("normalizes ATTOM payloads into internal listing enrichment fields", () => {
    const result = normalizeAttomProperty(
      {
        identifier: { attomId: "attom-123" },
        address: {
          line1: "1811 Willow Creek Drive",
          locality: "Austin",
          countrySubd: "TX",
          postal1: "78702",
          oneLine: "1811 Willow Creek Drive, Austin, TX 78702"
        },
        summary: { propLandUse: "Single Family Residence", yearBuilt: "1999" },
        building: {
          rooms: { beds: "3", bathsTotal: "2" },
          size: { livingSize: "1850" }
        },
        lot: { lotSize2: "6200" },
        assessment: { tax: { taxAmt: "9123" } }
      },
      "1811 Willow Creek Drive"
    );

    expect(result.attomId).toBe("attom-123");
    expect(result.propertyDataSource).toBe("attom");
    expect(result.normalizedAddress?.city).toBe("Austin");
    expect(result.propertyFacts?.beds).toBe(3);
    expect(result.propertyFacts?.sqft).toBe(1850);
    expect(result.propertyFacts?.yearBuilt).toBe(1999);
  });

  it("falls back to fixture mode without inventing property facts", () => {
    const result = fixturePropertyLookup("1811 Willow Creek Drive, Austin, TX 78702");

    expect(result.propertyDataSource).toBe("fixture");
    expect(result.propertyMatchConfidence).toBeLessThan(0.5);
    expect(result.propertyFacts).toEqual({});
    expect(result.normalizedAddress?.state).toBe("TX");
  });

  it("requires ATTOM_API_KEY for runtime property lookup", async () => {
    vi.stubEnv("ATTOM_API_KEY", "");

    await expect(lookupPropertyByAddress("1811 Willow Creek Drive, Austin, TX 78702")).rejects.toThrow(
      "ATTOM_API_KEY is required for listing property lookup."
    );
  });

  it("uses manual mode instead of fixture mode when ATTOM has no matching property", async () => {
    vi.stubEnv("ATTOM_API_KEY", "attom-test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ property: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const result = await lookupPropertyByAddress("1811 Willow Creek Drive, Austin, TX 78702");

    expect(result.propertyDataSource).toBe("manual");
    expect(result.message).toContain("No ATTOM match");
  });

  it("normalizes Google address labels before requesting ATTOM facts", async () => {
    vi.stubEnv("ATTOM_API_KEY", "attom-test-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ property: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await lookupPropertyByAddress("120 Lard Road, San Ramon, California 94582, USA");

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.searchParams.get("address1")).toBe("120 Lard Road");
    expect(requestUrl.searchParams.get("address2")).toBe("San Ramon, CA 94582");
    expect(requestUrl.searchParams.has("address")).toBe(false);
  });

  it("uses Google place details to add ZIP before requesting ATTOM facts", async () => {
    vi.stubEnv("ATTOM_API_KEY", "attom-test-key");
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "places-test-key");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            formattedAddress: "1233 Laguna St, San Francisco, CA 94115, USA",
            addressComponents: [
              { longText: "1233", shortText: "1233", types: ["street_number"] },
              { longText: "Laguna Street", shortText: "Laguna St", types: ["route"] },
              { longText: "San Francisco", shortText: "SF", types: ["locality"] },
              { longText: "California", shortText: "CA", types: ["administrative_area_level_1"] },
              { longText: "94115", shortText: "94115", types: ["postal_code"] }
            ]
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ property: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    const result = await lookupPropertyByAddress("1233 Laguna Street, San Francisco, CA", {
      placeId: "place-laguna"
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://places.googleapis.com/v1/places/place-laguna");
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Goog-FieldMask": "formattedAddress,addressComponents"
        })
      })
    );
    const requestUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(requestUrl.searchParams.get("address1")).toBe("1233 Laguna Street");
    expect(requestUrl.searchParams.get("address2")).toBe("San Francisco, CA 94115");
    expect(result.normalizedAddress?.label).toBe("1233 Laguna St, San Francisco, CA 94115");
  });

  it("returns a manual fallback when ATTOM rejects the address shape", async () => {
    vi.stubEnv("ATTOM_API_KEY", "attom-test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: { msg: "Bad Request" } }), {
        status: 400,
        headers: { "content-type": "application/json" }
      })
    );

    const result = await lookupPropertyByAddress("120 Lard Road, San Ramon, CA 94582");

    expect(result.propertyDataSource).toBe("manual");
    expect(result.message).toContain("ATTOM could not read that address");
  });

  it("does not call ATTOM when the address is too incomplete for property lookup", async () => {
    vi.stubEnv("ATTOM_API_KEY", "attom-test-key");
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const result = await lookupPropertyByAddress("120 Lard");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.propertyDataSource).toBe("manual");
    expect(result.message).toContain("complete street address");
  });

  it("returns Google Places address suggestions for dashboard listing entry", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "places-test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              placePrediction: {
                placeId: "place-1",
                text: { text: "24 Lakeview Lane, Denver, CO 80211" },
                structuredFormat: {
                  mainText: { text: "24 Lakeview Lane" },
                  secondaryText: { text: "Denver, CO 80211" }
                }
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    const suggestions = await searchListingAddressSuggestions("24 lake");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:autocomplete",
      expect.objectContaining({
        body: expect.stringContaining('"includedPrimaryTypes":["street_address","premise","subpremise"]')
      })
    );
    expect(suggestions[0]).toEqual({
      label: "24 Lakeview Lane, Denver, CO 80211",
      placeId: "place-1",
      secondaryLabel: "Denver, CO 80211",
      source: "google_places"
    });
  });

  it("does not invent a manual listing-address dropdown option when Google has no predictions", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "places-test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await expect(searchListingAddressSuggestions("120 lard")).resolves.toEqual([]);
  });
});
