import { z } from "zod";
import { transaction } from "@/lib/db/postgres";
import { ListingEnrichmentSchema } from "@/lib/listing-enrichment";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/types";
import type { Agent, ListingPayload, NotificationPreferences } from "@/lib/types";
import { upsertDevAgent } from "@/lib/dev-store";

const blankStringToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);
const optionalText = z.preprocess(blankStringToNull, z.string().min(1).nullable().optional());
const optionalUrl = z.preprocess(blankStringToNull, z.string().url().nullable().optional());

const listingPayloadSchema = z.object({
  address: z.string().min(3),
  price: z.number().int().positive(),
  beds: z.number().int().min(0),
  baths: z.number().min(0),
  sqft: z.number().int().positive().nullable().optional(),
  neighborhood: optionalText,
  property_type: optionalText,
  features: z.array(z.string()).default([]),
  dealBreakerFlags: z.array(z.string()).default([]),
  videoUrl: optionalUrl,
  videoSource: z.enum(["instagram", "tiktok", "mp4"]).nullable().optional(),
  description: z.string().nullable().optional(),
  agent_note: z.string().nullable().optional(),
  isPocket: z.boolean().optional()
}).merge(ListingEnrichmentSchema);

const agentSetupPayloadSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase, URL-safe, and contain no spaces"),
  name: z.string().min(2),
  market: z.string().min(2),
  neighborhoods: z.array(z.string().min(1)).min(1),
  headshotUrl: z.string().min(8),
  bio: z.string().min(8),
  headline: z.string().min(4).optional(),
  subHeadline: z.string().min(4).optional(),
  voiceNotes: z.string().min(8).optional(),
  phone: z.string().min(5),
  email: z.string().email(),
  closedVolumeUsd: z.number().int().min(0).optional(),
  buyersPlaced: z.number().int().min(0).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  paused: z.boolean().optional(),
  notificationPreferences: z
    .object({
      new_lead: z.boolean().optional(),
      showing_requested: z.boolean().optional(),
      hot_lead: z.boolean().optional(),
      weekly_summary: z.boolean().optional()
    })
    .optional(),
  listings: z.array(listingPayloadSchema).min(1)
});

export type AgentSetupPayload = Omit<
  z.input<typeof agentSetupPayloadSchema>,
  "listings" | "notificationPreferences"
> & {
  listings: ListingPayload[];
  notificationPreferences?: Partial<NotificationPreferences>;
};

export async function onboardAgent(payload: AgentSetupPayload): Promise<Agent> {
  const parsed = agentSetupPayloadSchema.parse(payload) as AgentSetupPayload;
  const postgresAgent = await transaction<Agent>(async (client) => {
    await client.query("delete from agents where slug = $1", [parsed.slug]);
    const { rows } = await client.query<Agent>(
      `insert into agents (
        user_id, slug, name, market, neighborhoods, headshot_url, bio, headline,
        sub_headline, voice_notes, phone, email, closed_volume_usd, buyers_placed,
        accent_color, paused, notification_preferences
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      returning *`,
      [
        parsed.userId ?? null,
        parsed.slug,
        parsed.name,
        parsed.market,
        parsed.neighborhoods,
        parsed.headshotUrl,
        parsed.bio,
        parsed.headline ?? `Find your home in ${parsed.market}, with ${parsed.name.split(" ")[0] ?? parsed.name}.`,
        parsed.subHeadline ?? "Curated listings. Personally shown. Off-market access.",
        parsed.voiceNotes ?? null,
        parsed.phone,
        parsed.email,
        parsed.closedVolumeUsd ?? 0,
        parsed.buyersPlaced ?? 0,
        parsed.accentColor ?? "#C97B5C",
        parsed.paused ?? false,
        JSON.stringify({
          new_lead: false,
          showing_requested: true,
          hot_lead: true,
          weekly_summary: false,
          ...(parsed.notificationPreferences ?? {})
        })
      ]
    );
    const agent = rows[0];
    await client.query(
      `insert into domains (agent_id, domain, type, verified)
       values ($1, $2, 'path', true)`,
      [agent.id, `/${agent.slug}`]
    );
    for (const listing of parsed.listings) {
      await client.query(
        `insert into listings (
          agent_id, address, price, beds, baths, sqft, neighborhood, property_type,
          features, deal_breaker_flags, video_url, video_source, description,
          agent_note, is_pocket, attom_id, property_data_source, property_enriched_at,
          property_match_confidence, normalized_address, property_facts, property_override_fields
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
        [
          agent.id,
          listing.address,
          listing.price,
          listing.beds,
          listing.baths,
          listing.sqft ?? null,
          listing.neighborhood ?? null,
          listing.property_type ?? null,
          listing.features ?? [],
          listing.dealBreakerFlags ?? [],
          listing.videoUrl ?? null,
          listing.videoSource ?? null,
          listing.description ?? null,
          listing.agent_note ?? null,
          listing.isPocket ?? false,
          listing.attomId ?? null,
          listing.propertyDataSource ?? null,
          listing.propertyEnrichedAt ?? null,
          listing.propertyMatchConfidence ?? null,
          JSON.stringify(listing.normalizedAddress ?? null),
          JSON.stringify(listing.propertyFacts ?? null),
          listing.propertyOverrideFields ?? []
        ]
      );
    }
    return agent;
  });
  if (postgresAgent) return postgresAgent;

  const supabase = getServiceSupabase();

  if (!supabase) {
    return upsertDevAgent(parsed);
  }

  const { data, error } = await supabase.rpc("onboard_agent", {
    payload: parsed as unknown as Json
  });

  if (error) {
    throw new Error(`Failed to onboard agent ${parsed.slug}: ${error.message}`);
  }

  const agent = Array.isArray(data) ? data[0] : data;
  if (!agent) {
    throw new Error(`onboard_agent returned no agent for ${parsed.slug}`);
  }

  return agent as Agent;
}
