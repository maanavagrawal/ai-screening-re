import {
  createDevListing,
  deleteDevListing,
  getDevListingForAgent,
  getDevListings,
  updateDevListing
} from "@/lib/dev-store";
import { hasPostgresEnv, query } from "@/lib/db/postgres";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Listing, ListingPayload } from "@/lib/types";

function toInsert(agentId: string, listing: ListingPayload) {
  return {
    agent_id: agentId,
    address: listing.address,
    price: listing.price,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft ?? null,
    neighborhood: listing.neighborhood ?? null,
    property_type: listing.property_type ?? null,
    features: listing.features ?? [],
    deal_breaker_flags: listing.dealBreakerFlags ?? [],
    video_url: listing.videoUrl ?? null,
    video_source: listing.videoSource ?? null,
    description: listing.description ?? null,
    agent_note: listing.agent_note ?? null,
    is_pocket: listing.isPocket ?? false
  };
}

export async function getListingsForAgent(agentId: string): Promise<Listing[]> {
  if (hasPostgresEnv()) {
    const { rows } = (await query<Listing>(
      "select * from listings where agent_id = $1 order by created_at desc",
      [agentId]
    )) ?? { rows: [] };
    return rows;
  }

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
  if (hasPostgresEnv()) {
    const { rows } = (await query<Listing>(
      "select * from listings where agent_id = $1 and id = $2 limit 1",
      [agentId, listingId]
    )) ?? { rows: [] };
    return rows[0] ?? null;
  }

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

export async function createListingForAgent(agentId: string, listing: ListingPayload): Promise<Listing> {
  if (hasPostgresEnv()) {
    const row = toInsert(agentId, listing);
    const { rows } = (await query<Listing>(
      `insert into listings (
        agent_id, address, price, beds, baths, sqft, neighborhood, property_type,
        features, deal_breaker_flags, video_url, video_source, description,
        agent_note, is_pocket
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      returning *`,
      [
        row.agent_id,
        row.address,
        row.price,
        row.beds,
        row.baths,
        row.sqft,
        row.neighborhood,
        row.property_type,
        row.features,
        row.deal_breaker_flags,
        row.video_url,
        row.video_source,
        row.description,
        row.agent_note,
        row.is_pocket
      ]
    )) ?? { rows: [] };
    return rows[0];
  }

  const supabase = getServiceSupabase();
  if (!supabase) return createDevListing(agentId, listing);

  const { data, error } = await supabase.from("listings").insert(toInsert(agentId, listing)).select("*").single();
  if (error) throw new Error(`Failed to create listing: ${error.message}`);
  return data as Listing;
}

export async function updateListingForAgent(
  agentId: string,
  listingId: string,
  patch: Partial<ListingPayload>
): Promise<Listing | null> {
  const supabase = getServiceSupabase();
  const rowPatch: Partial<Listing> = {
    ...(patch.address !== undefined ? { address: patch.address } : {}),
    ...(patch.price !== undefined ? { price: patch.price } : {}),
    ...(patch.beds !== undefined ? { beds: patch.beds } : {}),
    ...(patch.baths !== undefined ? { baths: patch.baths } : {}),
    ...(patch.sqft !== undefined ? { sqft: patch.sqft ?? null } : {}),
    ...(patch.neighborhood !== undefined ? { neighborhood: patch.neighborhood ?? null } : {}),
    ...(patch.property_type !== undefined ? { property_type: patch.property_type ?? null } : {}),
    ...(patch.features !== undefined ? { features: patch.features ?? [] } : {}),
    ...(patch.dealBreakerFlags !== undefined ? { deal_breaker_flags: patch.dealBreakerFlags ?? [] } : {}),
    ...(patch.videoUrl !== undefined ? { video_url: patch.videoUrl ?? null } : {}),
    ...(patch.videoSource !== undefined ? { video_source: patch.videoSource ?? null } : {}),
    ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
    ...(patch.agent_note !== undefined ? { agent_note: patch.agent_note ?? null } : {}),
    ...(patch.isPocket !== undefined ? { is_pocket: patch.isPocket } : {})
  };

  if (hasPostgresEnv()) {
    const keys = Object.keys(rowPatch) as Array<keyof Listing>;
    if (!keys.length) return getListingForAgent(agentId, listingId);
    const assignments = keys.map((key, index) => `${String(key)} = $${index + 3}`).join(", ");
    const values = keys.map((key) => rowPatch[key]);
    const { rows } = (await query<Listing>(
      `update listings set ${assignments} where agent_id = $1 and id = $2 returning *`,
      [agentId, listingId, ...values]
    )) ?? { rows: [] };
    return rows[0] ?? null;
  }

  if (!supabase) return updateDevListing(agentId, listingId, rowPatch);

  const { data, error } = await supabase
    .from("listings")
    .update(rowPatch)
    .eq("agent_id", agentId)
    .eq("id", listingId)
    .select("*")
    .single();
  if (error) throw new Error(`Failed to update listing: ${error.message}`);
  return data as Listing;
}

export async function deleteListingForAgent(agentId: string, listingId: string): Promise<boolean> {
  if (hasPostgresEnv()) {
    await query("delete from listings where agent_id = $1 and id = $2", [agentId, listingId]);
    return true;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return deleteDevListing(agentId, listingId);

  const { error } = await supabase.from("listings").delete().eq("agent_id", agentId).eq("id", listingId);
  if (error) throw new Error(`Failed to delete listing: ${error.message}`);
  return true;
}
