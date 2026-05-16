import { NextResponse } from "next/server";
import { z } from "zod";
import { generateProfileHeadline } from "@/lib/ai/anthropic";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentAgent } from "@/lib/auth/session";

const BodySchema = z.object({
  bio: z.string().trim().min(8).optional(),
  market: z.string().trim().min(2).optional()
});

export async function POST(request: Request) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const bio = parsed.data.bio ?? agent.bio?.trim();
  if (!bio) {
    return NextResponse.json({ error: "Add a bio before generating a headline." }, { status: 400 });
  }

  const result = await generateProfileHeadline({
    name: agent.name,
    market: parsed.data.market ?? agent.market,
    bio
  });

  return NextResponse.json({ headline: result.headline });
}
