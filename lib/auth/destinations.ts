import { getAgentByUserId } from "@/lib/auth/session";
import { getSetupDraft } from "@/lib/setup/drafts";

const DASHBOARD_PATHS = new Set([
  "/dashboard",
  "/dashboard/leads",
  "/dashboard/listings",
  "/dashboard/distribution",
  "/dashboard/settings"
]);

const SETUP_STEPS = new Set([
  "welcome",
  "basics",
  "voice",
  "listings",
  "neighborhoods",
  "phone",
  "link",
  "simulation"
]);

export function sanitizeReturnTo(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;

  let url: URL;
  try {
    url = new URL(trimmed, "https://app.local");
  } catch {
    return null;
  }

  if (url.origin !== "https://app.local") return null;
  const normalized = url.pathname.replace(/\/+$/, "") || "/";
  return DASHBOARD_PATHS.has(normalized) ? normalized : null;
}

export function dashboardReturnPath(section: string | null | undefined) {
  const path = section ? `/dashboard/${section}` : "/dashboard/leads";
  return sanitizeReturnTo(path) ?? "/dashboard/leads";
}

export async function resolveAgentAccessDestination(input: {
  userId: string;
  returnTo?: string | null;
}) {
  const agent = await getAgentByUserId(input.userId);
  const safeReturnTo = sanitizeReturnTo(input.returnTo);
  if (agent) return safeReturnTo ?? "/dashboard/leads";

  const draft = await getSetupDraft(input.userId);
  const step = draft?.current_step;
  if (step && SETUP_STEPS.has(step)) return `/setup/${step}`;

  return "/setup/welcome";
}
