import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { recomputeLeadTemperature } from "@/lib/leads";

const BodySchema = z.object({ lead_id: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;
  return NextResponse.json({ lead: await recomputeLeadTemperature(parsed.data.lead_id) });
}

