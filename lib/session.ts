import { cookies } from "next/headers";

export const SESSION_COOKIE = "buyer_session_id";
export const LEAD_COOKIE = "buyer_lead_id";

export async function getOrCreateSessionId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const sessionId = crypto.randomUUID();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180
  });
  return sessionId;
}

export async function getSessionId() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function setLeadCookie(leadId: string) {
  const cookieStore = await cookies();
  cookieStore.set(LEAD_COOKIE, leadId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180
  });
}

export async function getLeadIdCookie() {
  return (await cookies()).get(LEAD_COOKIE)?.value ?? null;
}
