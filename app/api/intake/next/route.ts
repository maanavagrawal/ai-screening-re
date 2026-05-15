import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { chooseNextQuestion, shouldUseAiNextQuestion } from "@/lib/ai/anthropic";
import { IntakeAnswersSchema } from "@/lib/ai/schemas";
import { getListingsForAgent } from "@/lib/listings";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

const BodySchema = z.object({
  agent_slug: z.string().min(1),
  answers: IntakeAnswersSchema
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const body = parsed.data;
  const agent = await resolveAgentBySlug(body.agent_slug);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const listings = shouldUseAiNextQuestion() ? await getListingsForAgent(agent.id) : undefined;
  const decision = await chooseNextQuestion({ agent, listings, answers: body.answers });
  return NextResponse.json(decision);
}
