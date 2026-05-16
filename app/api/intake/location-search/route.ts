import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getListingsForAgent } from "@/lib/listings";
import { searchLocationSuggestions } from "@/lib/location/search";
import { providerErrorMessage, providerErrorStatus } from "@/lib/provider-config";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

const LocationSearchSchema = z.object({
  agent_slug: z.string().min(1),
  query: z.string().max(120).default("")
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, LocationSearchSchema);
  if ("response" in parsed) return parsed.response;

  const agent = await resolveAgentBySlug(parsed.data.agent_slug);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  try {
    const listings = await getListingsForAgent(agent.id);
    const suggestions = await searchLocationSuggestions({
      query: parsed.data.query,
      agent,
      listings
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: providerErrorMessage(error, "Location search failed") },
      { status: providerErrorStatus(error) }
    );
  }
}
