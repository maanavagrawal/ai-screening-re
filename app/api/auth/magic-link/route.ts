import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { createAgentMagicLink, devUserIdFromEmail, setAgentSession } from "@/lib/auth/session";
import { hasPostgresEnv } from "@/lib/db/postgres";
import { saveSetupDraft } from "@/lib/setup/drafts";
import { hasSupabaseEnv } from "@/lib/supabase/service";

const BodySchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const email = parsed.data.email.toLowerCase();
  const origin = new URL(request.url).origin;

  if (hasPostgresEnv()) {
    const { userId, token } = await createAgentMagicLink({ email });
    await saveSetupDraft({ userId, currentStep: "welcome", data: { userId, email } });
    const verifyUrl = `${origin}/auth/verify?token=${encodeURIComponent(token)}`;

    if (!process.env.RESEND_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "RESEND_API_KEY is required for Railway magic links" }, { status: 500 });
      }
      console.info("[auth:magic-link]", verifyUrl);
      return NextResponse.json({ ok: true, devLink: verifyUrl });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Memoir <onboarding@resend.dev>",
        to: email,
        subject: "Sign in to your buyer page setup",
        html: `<p>Click to continue your setup:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 15 minutes.</p>`
      })
    });

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (hasSupabaseEnv() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
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
