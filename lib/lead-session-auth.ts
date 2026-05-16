import { cookies } from "next/headers";
import { LEAD_COOKIE, SESSION_COOKIE } from "@/lib/session";
import type { Lead } from "@/lib/types";

export function isLeadSessionAuthorized(
  lead: Pick<Lead, "id" | "session_id">,
  cookieLeadId?: string | null,
  cookieSessionId?: string | null
) {
  return cookieLeadId === lead.id || cookieSessionId === lead.session_id;
}

export async function hasLeadSession(lead: Pick<Lead, "id" | "session_id">) {
  const cookieStore = await cookies();
  return isLeadSessionAuthorized(
    lead,
    cookieStore.get(LEAD_COOKIE)?.value,
    cookieStore.get(SESSION_COOKIE)?.value
  );
}
