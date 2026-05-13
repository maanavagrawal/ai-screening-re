import { getDevSetupDraft, upsertDevSetupDraft } from "@/lib/dev-store";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { AgentSetupDraftData, SetupDraft } from "@/lib/types";

export async function getSetupDraft(userId: string): Promise<SetupDraft | null> {
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

export async function saveSetupDraft(input: {
  userId: string;
  data: Partial<AgentSetupDraftData>;
  currentStep: string;
}): Promise<SetupDraft> {
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

