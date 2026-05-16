import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentUserId } from "@/lib/auth/session";
import { searchLocationSuggestions } from "@/lib/location/search";
import { providerErrorMessage, providerErrorStatus } from "@/lib/provider-config";

const SetupLocationSuggestionsSchema = z.object({
  query: z.string().min(2).max(120),
  market: z.string().max(120).optional(),
  neighborhoods: z.array(z.string().min(1).max(120)).max(25).optional()
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, SetupLocationSuggestionsSchema);
  if ("response" in parsed) return parsed.response;

  const query = parsed.data.query.trim();
  const market = parsed.data.market?.trim() ?? "";

  try {
    const suggestions = await searchLocationSuggestions({
      query,
      providerQuery: market && !query.toLowerCase().includes(market.toLowerCase()) ? `${query}, ${market}` : query,
      agent: {
        market,
        neighborhoods: parsed.data.neighborhoods ?? []
      },
      listings: []
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: providerErrorMessage(error, "Location suggestions failed") },
      { status: providerErrorStatus(error) }
    );
  }
}
