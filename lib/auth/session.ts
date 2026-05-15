import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import {
  getDevAgentByUserId,
  getFirstDevAgent
} from "@/lib/dev-store";
import { hasPostgresEnv, query } from "@/lib/db/postgres";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/service";
import type { Agent } from "@/lib/types";

export const AGENT_USER_COOKIE = "agent_user_id";
export const AGENT_EMAIL_COOKIE = "agent_email";
export const AGENT_SLUG_COOKIE = "agent_slug";
export const AGENT_SESSION_COOKIE = "agent_session";

export function devUserIdFromEmail(email: string) {
  const hash = createHash("sha1").update(email.toLowerCase()).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function setAgentSession(input: { userId: string; email?: string | null; agentSlug?: string | null }) {
  const store = await cookies();
  if (hasPostgresEnv()) {
    const token = randomBytes(32).toString("base64url");
    await query(
      `insert into agent_sessions (user_id, email, token_hash, expires_at)
       values ($1, $2, $3, now() + interval '180 days')`,
      [input.userId, input.email ?? null, hashToken(token)]
    );
    store.set(AGENT_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180
    });
  }
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
  if (hasPostgresEnv()) {
    const sessionToken = (await cookies()).get(AGENT_SESSION_COOKIE)?.value;
    if (!sessionToken) return null;
    const { rows } = (await query<{ user_id: string }>(
      `select user_id
       from agent_sessions
       where token_hash = $1 and expires_at > now()
       order by created_at desc
       limit 1`,
      [hashToken(sessionToken)]
    )) ?? { rows: [] };
    return rows[0]?.user_id ?? null;
  }

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
  if (userId) return getAgentByUserId(userId);
  if (!hasSupabaseEnv()) return getFirstDevAgent();
  return null;
}

export async function getAgentByUserId(userId: string): Promise<Agent | null> {
  if (hasPostgresEnv()) {
    const { rows } = (await query<Agent>("select * from agents where user_id = $1 limit 1", [userId])) ?? { rows: [] };
    return rows[0] ?? null;
  }

  const supabase = getServiceSupabase();

  if (supabase) {
    const { data, error } = await supabase.from("agents").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(`Failed to load current agent: ${error.message}`);
    return (data as Agent | null) ?? null;
  }

  return getDevAgentByUserId(userId);
}

export async function getAuthenticatedAgent(): Promise<Agent | null> {
  const userId = await getCurrentUserId();
  return userId ? getAgentByUserId(userId) : null;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAgentMagicLink(input: { email: string; returnTo?: string | null }) {
  const userId = devUserIdFromEmail(input.email);
  const token = randomBytes(32).toString("base64url");
  await query(
    `insert into agent_magic_links (user_id, email, token_hash, return_to, expires_at)
     values ($1, $2, $3, $4, now() + interval '15 minutes')`,
    [userId, input.email.toLowerCase(), hashToken(token), input.returnTo ?? null]
  );
  return { userId, token };
}

export type AgentMagicLinkLookup = {
  id: string;
  user_id: string;
  email: string;
  return_to: string | null;
  used_at: string | null;
  expires_at: string;
};

export async function getAgentMagicLink(token: string) {
  const hashed = hashToken(token);
  const { rows } = (await query<AgentMagicLinkLookup>(
    `select id, user_id, email, return_to, used_at, expires_at
     from agent_magic_links
     where token_hash = $1
     limit 1`,
    [hashed]
  )) ?? { rows: [] };
  return rows[0] ?? null;
}

export function isAgentMagicLinkUsable(link: AgentMagicLinkLookup | null) {
  return Boolean(link && !link.used_at && new Date(link.expires_at).getTime() > Date.now());
}

export async function consumeAgentMagicLink(token: string) {
  const hashed = hashToken(token);
  const { rows } = (await query<{ id: string; user_id: string; email: string; return_to: string | null }>(
    `update agent_magic_links
     set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now()
     returning id, user_id, email, return_to`,
    [hashed]
  )) ?? { rows: [] };
  return rows[0] ?? null;
}
