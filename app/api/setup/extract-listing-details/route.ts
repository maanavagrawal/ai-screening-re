import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentUserId } from "@/lib/auth/session";
import { extractListingDetailsFromText } from "@/lib/setup/listing-details-extract";

const BodySchema = z.object({
  text: z.string().min(20).max(6000),
  neighborhoods: z.array(z.string()).optional()
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const details = await extractListingDetailsFromText(parsed.data);
  return NextResponse.json({ details });
}
