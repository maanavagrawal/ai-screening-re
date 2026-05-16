import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentAgent } from "@/lib/auth/session";
import { ListingEnrichmentSchema } from "@/lib/listing-enrichment";
import { deleteListingForAgent, updateListingForAgent } from "@/lib/listings";

const PatchSchema = z
  .object({
    address: z.string().min(3).optional(),
    price: z.number().int().positive().optional(),
    beds: z.number().int().min(0).optional(),
    baths: z.number().min(0).optional(),
    sqft: z.number().int().positive().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    property_type: z.string().nullable().optional(),
    features: z.array(z.string()).optional(),
    dealBreakerFlags: z.array(z.string()).optional(),
    videoUrl: z.string().url().nullable().optional(),
    videoSource: z.enum(["instagram", "tiktok", "mp4"]).nullable().optional(),
    description: z.string().nullable().optional(),
    agent_note: z.string().nullable().optional(),
    isPocket: z.boolean().optional()
  })
  .merge(ListingEnrichmentSchema.partial())
  .partial();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, PatchSchema);
  if ("response" in parsed) return parsed.response;
  const { id } = await context.params;
  const listing = await updateListingForAgent(agent.id, id, parsed.data);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  return NextResponse.json({ listing });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await context.params;
  const deleted = await deleteListingForAgent(agent.id, id);
  if (!deleted) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
