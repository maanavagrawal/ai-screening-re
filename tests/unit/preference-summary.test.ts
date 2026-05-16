import { describe, expect, it } from "vitest";
import { preferenceSummary } from "@/lib/dashboard/preference-summary";

describe("preference summary", () => {
  it("turns buyer preferences into readable dashboard rows", () => {
    const summary = preferenceSummary({
      budget_min: 650000,
      budget_max: 750000,
      selected_areas: [{ label: "East Austin", source: "google_places", type: "neighborhood" }],
      bedrooms: "3",
      bathrooms: "2",
      financing: "pre_approved",
      must_haves: ["yard", "home_office"]
    });

    expect(summary).toContainEqual({ label: "Budget", value: "$650k - $750k" });
    expect(summary).toContainEqual({ label: "Areas", value: "East Austin" });
    expect(summary).toContainEqual({ label: "Beds/baths", value: "3+ bed, 2+ bath" });
    expect(summary).toContainEqual({ label: "Must-haves", value: "yard, home office" });
  });
});
