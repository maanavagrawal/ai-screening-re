import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { extractPreferences } from "@/lib/ai/anthropic";
import { resolveAgentBySlug } from "@/lib/resolve-agent";
import { getListingsForAgent } from "@/lib/listings";

const BodySchema = z.object({
  agent_slug: z.string().min(1),
  free_text: z.string().min(2),
  answers: z.unknown().optional()
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const body = parsed.data;
  const agent = await resolveAgentBySlug(body.agent_slug);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const listings = await getListingsForAgent(agent.id);
  const extraction = await extractPreferences({
    agent,
    listings,
    freeText: body.free_text,
    answersSoFar: body.answers ?? {}
  });

  return NextResponse.json({ extraction });
}
