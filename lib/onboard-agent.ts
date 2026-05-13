import { z } from "zod";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/types";
import type { Agent, ListingPayload } from "@/lib/types";
import { upsertDevAgent } from "@/lib/dev-store";

const listingPayloadSchema = z.object({
  address: z.string().min(3),
  price: z.number().int().positive(),
  beds: z.number().int().min(0),
  baths: z.number().min(0),
  sqft: z.number().int().positive().nullable().optional(),
  neighborhood: z.string().min(1).nullable().optional(),
  property_type: z.string().min(1).nullable().optional(),
  features: z.array(z.string()).default([]),
  dealBreakerFlags: z.array(z.string()).default([]),
  videoUrl: z.string().url().nullable().optional(),
  videoSource: z.enum(["instagram", "tiktok", "mp4"]).nullable().optional(),
  description: z.string().nullable().optional(),
  agent_note: z.string().nullable().optional(),
  isPocket: z.boolean().optional()
});

const agentSetupPayloadSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase, URL-safe, and contain no spaces"),
  name: z.string().min(2),
  market: z.string().min(2),
  neighborhoods: z.array(z.string().min(1)).min(1),
  headshotUrl: z.string().url(),
  bio: z.string().min(8),
  phone: z.string().min(5),
  email: z.string().email(),
  closedVolumeUsd: z.number().int().min(0).optional(),
  buyersPlaced: z.number().int().min(0).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  listings: z.array(listingPayloadSchema).min(1)
});

export type AgentSetupPayload = z.infer<typeof agentSetupPayloadSchema> & {
  listings: ListingPayload[];
};

export async function onboardAgent(payload: AgentSetupPayload): Promise<Agent> {
  const parsed = agentSetupPayloadSchema.parse(payload) as AgentSetupPayload;
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
