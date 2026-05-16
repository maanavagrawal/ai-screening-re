import { describe, expect, it } from "vitest";
import { clearedListingEnrichment, enrichmentToRow } from "@/lib/listing-enrichment";

describe("listing enrichment helpers", () => {
  it("clears every persisted enrichment field for edited addresses", () => {
    expect(enrichmentToRow(clearedListingEnrichment())).toEqual({
      attom_id: null,
      property_data_source: null,
      property_enriched_at: null,
      property_match_confidence: null,
      normalized_address: null,
      property_facts: null,
      property_override_fields: []
    });
  });
});
