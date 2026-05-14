import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentUserId } from "@/lib/auth/session";
import { checkDevAgentVerifyCode } from "@/lib/dev-store";
import { getSetupDraft, saveSetupDraft } from "@/lib/setup/drafts";

const BodySchema = z.object({
  code: z.string().min(4)
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const draft = await getSetupDraft(userId);
  const phone = draft?.data.phone;
  const canUseTwilio = Boolean(
    process.env.DISABLE_TWILIO !== "1" &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID &&
      phone
  );

  let approved = false;
  if (canUseTwilio) {
    const { default: twilio } = await import("twilio");
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const check = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!).verificationChecks.create({
      to: phone,
      code: parsed.data.code
    });
    approved = check.status === "approved";
  } else {
    approved = checkDevAgentVerifyCode(userId, parsed.data.code);
  }

  if (!approved) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await saveSetupDraft({ userId, currentStep: "phone", data: { phoneVerified: true } });
  return NextResponse.json({ ok: true });
}
