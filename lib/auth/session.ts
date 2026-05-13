import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import {
  getDevAgentByUserId,
  getFirstDevAgent
} from "@/lib/dev-store";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/service";
import type { Agent } from "@/lib/types";

export const AGENT_USER_COOKIE = "agent_user_id";
export const AGENT_EMAIL_COOKIE = "agent_email";
export const AGENT_SLUG_COOKIE = "agent_slug";

export function devUserIdFromEmail(email: string) {
  const hash = createHash("sha1").update(email.toLowerCase()).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function setAgentSession(input: { userId: string; email?: string | null; agentSlug?: string | null }) {
  const store = await cookies();
  store.set(AGENT_USER_COOKIE, input.userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180
  });
  if (input.email) {
    store.set(AGENT_EMAIL_COOKIE, input.email, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180
    });
  }
  if (input.agentSlug) {
    store.set(AGENT_SLUG_COOKIE, input.agentSlug, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180
    });
  }
}

export async function getCurrentUserId() {
  if (
    hasSupabaseEnv() &&
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEV_AGENT_AUTH !== "1"
  ) {
    return null;
  }
  return (await cookies()).get(AGENT_USER_COOKIE)?.value ?? null;
}

export async function getCurrentAgent(): Promise<Agent | null> {
  const userId = await getCurrentUserId();
  const supabase = getServiceSupabase();

  if (supabase && userId) {
    const { data, error } = await supabase.from("agents").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(`Failed to load current agent: ${error.message}`);
    return (data as Agent | null) ?? null;
  }

  if (userId) return getDevAgentByUserId(userId);
  if (!hasSupabaseEnv()) return getFirstDevAgent();
  return null;
}
