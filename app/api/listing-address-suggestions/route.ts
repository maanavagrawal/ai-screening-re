import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentUserId } from "@/lib/auth/session";
import { searchListingAddressSuggestions } from "@/lib/property/lookup";
import { providerErrorMessage, providerErrorStatus } from "@/lib/provider-config";

const AddressSuggestionsSchema = z.object({
  query: z.string().min(3).max(160)
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, AddressSuggestionsSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const suggestions = await searchListingAddressSuggestions(parsed.data.query);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: providerErrorMessage(error, "Address suggestions failed") },
      { status: providerErrorStatus(error) }
    );
  }
}
