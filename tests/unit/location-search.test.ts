import { describe, expect, it } from "vitest";
import { fixtureLocationSuggestions } from "@/lib/location/search";

describe("location search fallback", () => {
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
});
