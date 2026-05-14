import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getMagicLinkMode } from "@/lib/auth/magic-link-mode";
import { createAgentMagicLink, devUserIdFromEmail, setAgentSession } from "@/lib/auth/session";
import { hasPostgresEnv } from "@/lib/db/postgres";
import { getPublicOriginFromRequest } from "@/lib/public-origin";
import { saveSetupDraft } from "@/lib/setup/drafts";
import { hasSupabaseEnv } from "@/lib/supabase/service";

const BodySchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const email = parsed.data.email.toLowerCase();
  const origin = getPublicOriginFromRequest(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mode = getMagicLinkMode({
    hasPostgres: hasPostgresEnv(),
    hasSupabase: hasSupabaseEnv(),
    hasSupabaseAnonKey: Boolean(supabaseAnonKey),
    hasResend: Boolean(process.env.RESEND_API_KEY),
    isProduction: process.env.NODE_ENV === "production",
    allowDevAgentAuth: process.env.ALLOW_DEV_AGENT_AUTH === "1"
  });

  if (mode === "postgres_missing_email") {
    return NextResponse.json({ error: "RESEND_API_KEY is required for Railway magic links" }, { status: 500 });
  }

  if (!origin) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is required to send reachable magic links" },
      { status: 500 }
    );
  }

  if (mode === "misconfigured") {
    return NextResponse.json(
      { error: "Agent signup is not configured. Add DATABASE_URL and RESEND_API_KEY in Railway." },
      { status: 500 }
    );
  }

  if (mode === "postgres_email" || mode === "postgres_dev_link") {
    const { userId, token } = await createAgentMagicLink({ email });
    await saveSetupDraft({ userId, currentStep: "welcome", data: { userId, email } });
    const verifyUrl = `${origin}/auth/verify?token=${encodeURIComponent(token)}`;

    if (mode === "postgres_dev_link") {
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

  if (mode === "supabase_email") {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase Auth is not configured" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/setup/welcome` }
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const userId = devUserIdFromEmail(email);
  await setAgentSession({ userId, email });
  await saveSetupDraft({ userId, currentStep: "welcome", data: { userId, email } });
  return NextResponse.json({ ok: true, redirectTo: "/setup/welcome" });
}
