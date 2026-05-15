import { getDevSetupDraft, upsertDevSetupDraft } from "@/lib/dev-store";
import { hasPostgresEnv, query } from "@/lib/db/postgres";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { AgentSetupDraftData, SetupDraft } from "@/lib/types";

export async function getSetupDraft(userId: string): Promise<SetupDraft | null> {
  if (hasPostgresEnv()) {
    const { rows } = (await query<SetupDraft>("select * from setup_drafts where user_id = $1 limit 1", [userId])) ?? { rows: [] };
    return rows[0] ?? null;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return getDevSetupDraft(userId);

  const { data, error } = await supabase
    .from("setup_drafts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load setup draft: ${error.message}`);
  return (data as SetupDraft | null) ?? null;
}

export async function ensureSetupDraftInitialized(input: {
  userId: string;
  email?: string | null;
}): Promise<SetupDraft> {
  const existing = await getSetupDraft(input.userId);
  if (existing) return existing;

  return saveSetupDraft({
    userId: input.userId,
    currentStep: "welcome",
    data: { userId: input.userId, email: input.email ?? undefined }
  });
}

export async function saveSetupDraft(input: {
  userId: string;
  data: Partial<AgentSetupDraftData>;
  currentStep: string;
}): Promise<SetupDraft> {
  if (hasPostgresEnv()) {
    const existing = await getSetupDraft(input.userId);
    const nextData = { ...(existing?.data ?? {}), ...input.data };
    const { rows } = (await query<SetupDraft>(
      `insert into setup_drafts (user_id, data, current_step, updated_at)
       values ($1, $2, $3, now())
       on conflict (user_id) do update
       set data = excluded.data,
           current_step = excluded.current_step,
           updated_at = now()
       returning *`,
      [input.userId, JSON.stringify(nextData), input.currentStep]
    )) ?? { rows: [] };
    return rows[0];
  }

  const supabase = getServiceSupabase();
  if (!supabase) return upsertDevSetupDraft(input);

  const existing = await getSetupDraft(input.userId);
  const nextData = { ...(existing?.data ?? {}), ...input.data };

  const { data, error } = await supabase
    .from("setup_drafts")
    .upsert(
      {
        user_id: input.userId,
        data: nextData,
        current_step: input.currentStep,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) throw new Error(`Failed to save setup draft: ${error.message}`);
  return data as SetupDraft;
}
