import { z } from "zod";
import type { Listing, ListingPayload } from "@/lib/types";

export const NormalizedAddressSchema = z
  .object({
    line1: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    label: z.string().nullable().optional()
  })
  .nullable()
  .optional();

export const PropertyFactsSchema = z
  .object({
    beds: z.number().min(0).nullable().optional(),
    baths: z.number().min(0).nullable().optional(),
    sqft: z.number().int().positive().nullable().optional(),
    propertyType: z.string().nullable().optional(),
    yearBuilt: z.number().int().min(1700).max(2100).nullable().optional(),
    lotSizeSqft: z.number().int().positive().nullable().optional(),
    stories: z.number().min(0).nullable().optional(),
    parking: z.string().nullable().optional(),
    assessedValue: z.number().int().positive().nullable().optional(),
    taxAnnualAmount: z.number().positive().nullable().optional(),
    sourceUpdatedAt: z.string().nullable().optional()
  })
  .nullable()
  .optional();

export const ListingEnrichmentSchema = z.object({
  attomId: z.string().nullable().optional(),
  propertyDataSource: z.enum(["attom", "manual", "fixture"]).nullable().optional(),
  propertyEnrichedAt: z.string().nullable().optional(),
  propertyMatchConfidence: z.number().min(0).max(1).nullable().optional(),
  normalizedAddress: NormalizedAddressSchema,
  propertyFacts: PropertyFactsSchema,
  propertyOverrideFields: z.array(z.string()).nullable().optional()
});

export type ListingEnrichmentInput = z.infer<typeof ListingEnrichmentSchema>;

export function enrichmentToRow(input: Partial<ListingPayload>) {
  return {
    ...(input.attomId !== undefined ? { attom_id: input.attomId ?? null } : {}),
    ...(input.propertyDataSource !== undefined ? { property_data_source: input.propertyDataSource ?? null } : {}),
    ...(input.propertyEnrichedAt !== undefined ? { property_enriched_at: input.propertyEnrichedAt ?? null } : {}),
    ...(input.propertyMatchConfidence !== undefined
      ? { property_match_confidence: input.propertyMatchConfidence ?? null }
      : {}),
    ...(input.normalizedAddress !== undefined ? { normalized_address: input.normalizedAddress ?? null } : {}),
    ...(input.propertyFacts !== undefined ? { property_facts: input.propertyFacts ?? null } : {}),
    ...(input.propertyOverrideFields !== undefined ? { property_override_fields: input.propertyOverrideFields ?? [] } : {})
  } satisfies Partial<Listing>;
}

export function enrichmentFromListing(listing: Listing): ListingEnrichmentInput {
  return {
    attomId: listing.attom_id ?? null,
    propertyDataSource: listing.property_data_source ?? null,
    propertyEnrichedAt: listing.property_enriched_at ?? null,
    propertyMatchConfidence: listing.property_match_confidence ?? null,
    normalizedAddress: listing.normalized_address ?? null,
    propertyFacts: listing.property_facts ?? null,
    propertyOverrideFields: listing.property_override_fields ?? []
  };
}
