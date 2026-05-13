import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentUserId } from "@/lib/auth/session";
import { extractListingFromUrl } from "@/lib/setup/listing-extract";

const BodySchema = z.object({
  url: z.string().url()
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  return NextResponse.json({ listing: await extractListingFromUrl(parsed.data.url) });
}

