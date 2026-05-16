import { humanEvent } from "@/lib/dashboard/activity-labels";
import type { Agent } from "@/lib/types";

export { humanEvent };

export function agentBaseUrl(agent: Agent, origin?: string) {
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
  const base = process.env.NEXT_PUBLIC_APP_URL || origin || browserOrigin || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${agent.slug}`;
}
