import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { devUserIdFromEmail, setAgentSession } from "@/lib/auth/session";
import { saveSetupDraft } from "@/lib/setup/drafts";
import { hasSupabaseEnv } from "@/lib/supabase/service";

const BodySchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const email = parsed.data.email.toLowerCase();
  if (hasSupabaseEnv() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const origin = new URL(request.url).origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/setup/welcome` }
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!hasSupabaseEnv() || process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_AGENT_AUTH === "1") {
    const userId = devUserIdFromEmail(email);
    await setAgentSession({ userId, email });
    await saveSetupDraft({ userId, currentStep: "welcome", data: { userId, email } });
  }
  return NextResponse.json({ ok: true, redirectTo: "/setup/welcome" });
}
