import { getDevAgentBySlug } from "@/lib/dev-store";
import { hasPostgresEnv, query } from "@/lib/db/postgres";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Agent } from "@/lib/types";

function normalizeSlug(value: string | null | undefined) {
  const slug = value?.trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return null;
  return slug;
}

function slugFromRequest(request: Request) {
  const url = new URL(request.url);
  const querySlug = normalizeSlug(url.searchParams.get("agent_slug"));
  const headerSlug = normalizeSlug(request.headers.get("x-agent-slug"));
  if (querySlug) return querySlug;
  if (headerSlug) return headerSlug;

  const [firstSegment] = url.pathname.split("/").filter(Boolean);
  if (!firstSegment || firstSegment === "api") return null;
  return normalizeSlug(firstSegment);
}

export async function resolveAgent(request: Request): Promise<Agent | null> {
  const slug = slugFromRequest(request);
  return resolveAgentBySlug(slug);
}

export async function resolveAgentBySlug(slug: string | null | undefined): Promise<Agent | null> {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;

  if (hasPostgresEnv()) {
    const { rows } = (await query<Agent>("select * from agents where slug = $1 limit 1", [normalizedSlug])) ?? { rows: [] };
    return rows[0] ?? null;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return getDevAgentBySlug(normalizedSlug);

  const { data, error } = await supabase.from("agents").select("*").eq("slug", normalizedSlug).maybeSingle();
  if (error) throw new Error(`Failed to resolve agent ${normalizedSlug}: ${error.message}`);
  return (data as Agent | null) ?? null;
}
