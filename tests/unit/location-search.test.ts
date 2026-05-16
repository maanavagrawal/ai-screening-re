import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureLocationSuggestions, searchLocationSuggestions } from "@/lib/location/search";
import type { Agent } from "@/lib/types";

const agent: Agent = {
  id: "agent-1",
  slug: "maya",
  name: "Maya Chen",
  headshot_url: null,
  bio: null,
  market: "Austin, TX",
  neighborhoods: ["East Austin", "Mueller"],
  phone: null,
  email: "maya@example.com",
  closed_volume_usd: 0,
  buyers_placed: 0,
  accent_color: "#C97B5C"
};

describe("location search fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns agent/listing area suggestions and a manual option", () => {
    const suggestions = fixtureLocationSuggestions({
      query: "east",
      agent: { market: "Austin, TX", neighborhoods: ["East Austin", "Mueller"] },
      listings: [{ neighborhood: "Cherrywood" }]
    });

    expect(suggestions[0]).toMatchObject({
      label: "East Austin",
      source: "agent_suggestion",
      type: "neighborhood"
    });
    expect(suggestions.some((item) => item.label === "east" && item.source === "manual")).toBe(true);
  });

  it("requires GOOGLE_PLACES_API_KEY for runtime typed location search", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");

    await expect(
      searchLocationSuggestions({
        query: "east",
        agent,
        listings: []
      })
    ).rejects.toThrow("GOOGLE_PLACES_API_KEY is required for buyer area autocomplete.");
  });

  it("uses Google Places suggestions when the provider is configured", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "places-test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              placePrediction: {
                placeId: "place-1",
                types: ["locality"],
                structuredFormat: {
                  mainText: { text: "East Austin" },
                  secondaryText: { text: "Austin, TX" }
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

    const suggestions = await searchLocationSuggestions({
      query: "east",
      agent: { ...agent, neighborhoods: [] },
      listings: []
    });

    expect(suggestions[0]).toMatchObject({
      label: "East Austin",
      source: "google_places",
      type: "city",
      attribution: "google"
    });
  });
});
