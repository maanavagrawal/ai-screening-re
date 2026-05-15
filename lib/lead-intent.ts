import type { Lead, Preferences } from "@/lib/types";

export function preferencesIntent(preferences: Preferences | null | undefined) {
  return preferences?.intent === "seller" ? "seller" : "buyer";
}

export function isSellerLead(lead: Pick<Lead, "preferences" | "source">) {
  return preferencesIntent(lead.preferences) === "seller" || lead.source === "seller_entry";
}

export function sellerDetails(preferences: Preferences | null | undefined) {
  return preferences?.seller;
}
