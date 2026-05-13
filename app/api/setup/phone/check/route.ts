import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentUserId } from "@/lib/auth/session";
import { checkDevAgentVerifyCode } from "@/lib/dev-store";
import { saveSetupDraft } from "@/lib/setup/drafts";

const BodySchema = z.object({
  code: z.string().min(4)
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  if (!checkDevAgentVerifyCode(userId, parsed.data.code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await saveSetupDraft({ userId, currentStep: "phone", data: { phoneVerified: true } });
  return NextResponse.json({ ok: true });
}

