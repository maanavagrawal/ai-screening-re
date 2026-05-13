import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentUserId } from "@/lib/auth/session";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

const BodySchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/)
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const agent = await resolveAgentBySlug(parsed.data.slug);
  return NextResponse.json({ available: !agent || agent.user_id === userId });
}

