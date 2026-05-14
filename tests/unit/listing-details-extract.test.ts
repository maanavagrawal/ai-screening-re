import { describe, expect, it } from "vitest";
import { fallbackListingDetails } from "@/lib/setup/listing-details-extract";

describe("fallbackListingDetails", () => {
  it("extracts core fields from pasted listing remarks", () => {
    const details = fallbackListingDetails({
      neighborhoods: ["East Austin", "Mueller"],
      text: [
        "123 Maple St",
        "$725,000 | 3 beds | 2 baths | 1,850 sqft",
        "East Austin single-family home with fenced yard, updated kitchen, garage, and quiet street."
      ].join("\n")
    });

    expect(details).toMatchObject({
      address: "123 Maple St",
      price: 725000,
      beds: 3,
      baths: 2,
      sqft: 1850,
      neighborhood: "East Austin",
      property_type: "house"
    });
    expect(details.features).toEqual(expect.arrayContaining(["yard", "updated_kitchen", "garage", "quiet_street"]));
    expect(details.confidence).toBe(1);
  });

  it("does not invent missing details", () => {
    const details = fallbackListingDetails({
      neighborhoods: ["East Austin"],
      text: "Bright home near coffee shops. Good light and a flexible layout."
    });

    expect(details.address).toBeNull();
    expect(details.price).toBeNull();
    expect(details.beds).toBeNull();
    expect(details.baths).toBeNull();
    expect(details.neighborhood).toBeNull();
  });
});
