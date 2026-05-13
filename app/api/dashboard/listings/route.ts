import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentAgent } from "@/lib/auth/session";
import { createListingForAgent, getListingsForAgent } from "@/lib/listings";

const ListingSchema = z.object({
  address: z.string().min(3),
  price: z.number().int().positive(),
  beds: z.number().int().min(0),
  baths: z.number().min(0),
  sqft: z.number().int().positive().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  property_type: z.string().nullable().optional(),
  features: z.array(z.string()).default([]),
  dealBreakerFlags: z.array(z.string()).default([]),
  videoUrl: z.string().url().nullable().optional(),
  videoSource: z.enum(["instagram", "tiktok", "mp4"]).nullable().optional(),
  description: z.string().nullable().optional(),
  agent_note: z.string().nullable().optional(),
  isPocket: z.boolean().default(false)
});

export async function GET() {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({ listings: await getListingsForAgent(agent.id) });
}

export async function POST(request: Request) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, ListingSchema);
  if ("response" in parsed) return parsed.response;
  const listing = await createListingForAgent(agent.id, parsed.data);
  return NextResponse.json({ listing });
}

