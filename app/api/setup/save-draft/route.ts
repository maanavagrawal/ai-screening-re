import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentUserId } from "@/lib/auth/session";
import { saveSetupDraft } from "@/lib/setup/drafts";

const BodySchema = z.object({
  current_step: z.string().min(1),
  data: z.record(z.unknown())
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const draft = await saveSetupDraft({
    userId,
    currentStep: parsed.data.current_step,
    data: parsed.data.data
  });
  return NextResponse.json({ draft });
}

