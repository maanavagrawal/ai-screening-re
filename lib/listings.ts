import { getDevListingForAgent, getDevListings } from "@/lib/dev-store";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Listing } from "@/lib/types";

export async function getListingsForAgent(agentId: string): Promise<Listing[]> {
  const supabase = getServiceSupabase();
  if (!supabase) return getDevListings(agentId);

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load listings: ${error.message}`);
  return (data ?? []) as Listing[];
}

export async function getListingForAgent(agentId: string, listingId: string): Promise<Listing | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return getDevListingForAgent(agentId, listingId);

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("agent_id", agentId)
    .eq("id", listingId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load listing: ${error.message}`);
  return (data as Listing | null) ?? null;
}
