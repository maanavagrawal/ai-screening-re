import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { parseAgentLinkInput } from "@/lib/root/agent-link";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

const BodySchema = z.object({
  value: z.string().min(1)
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const slug = parseAgentLinkInput(parsed.data.value);
  if (!slug) return notFound();

  const agent = await resolveAgentBySlug(slug);
  if (!agent) return notFound();

  return NextResponse.json({
    agent: {
      slug: agent.slug,
      name: agent.name,
      market: agent.market
    }
  });
}

function notFound() {
  return NextResponse.json(
    { error: "We could not find that agent link. Check the spelling or ask your agent." },
    { status: 404 }
  );
}
