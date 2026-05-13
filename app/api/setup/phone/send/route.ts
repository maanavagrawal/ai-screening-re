import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentUserId } from "@/lib/auth/session";
import { setDevAgentVerifyCode } from "@/lib/dev-store";
import { normalizePhone } from "@/lib/phone";
import { saveSetupDraft } from "@/lib/setup/drafts";

const BodySchema = z.object({
  phone: z.string().min(5)
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Valid phone required" }, { status: 400 });

  setDevAgentVerifyCode(userId, "123456");
  await saveSetupDraft({ userId, currentStep: "phone", data: { phone, phoneVerified: false } });
  return NextResponse.json({ ok: true, devCode: process.env.NODE_ENV === "production" ? undefined : "123456" });
}

