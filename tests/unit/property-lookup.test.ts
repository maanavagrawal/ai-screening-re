import { afterEach, describe, expect, it, vi } from "vitest";
import { fixturePropertyLookup, lookupPropertyByAddress, normalizeAttomProperty } from "@/lib/property/lookup";

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
});
