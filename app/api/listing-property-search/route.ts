import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentUserId } from "@/lib/auth/session";
import { lookupPropertyByAddress } from "@/lib/property/lookup";
import { providerErrorMessage, providerErrorStatus } from "@/lib/provider-config";

const PropertySearchSchema = z.object({
  address: z.string().min(3)
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, PropertySearchSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const result = await lookupPropertyByAddress(parsed.data.address);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: providerErrorMessage(error, "Property lookup failed") },
      { status: providerErrorStatus(error) }
    );
  }
}
