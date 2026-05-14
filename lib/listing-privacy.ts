import type { Listing } from "@/lib/types";

export const BUYER_ADDRESS_PLACEHOLDER = "Exact address shared after showing request";

export type BuyerSafeListingSummary = Omit<Listing, "address"> & {
  location_label: string;
};

export function buyerLocationLabel(listing: Pick<Listing, "neighborhood">) {
  return listing.neighborhood ? `${listing.neighborhood} area` : "Private location";
}

export function redactListingForBuyer<T extends Listing>(listing: T): T {
  return {
    ...listing,
    address: BUYER_ADDRESS_PLACEHOLDER
  };
}

export function redactListingsForBuyer<T extends Listing>(listings: T[]): T[] {
  return listings.map(redactListingForBuyer);
}

export function buyerSafeListingSummary(listing: Listing): BuyerSafeListingSummary {
  const safeListing = { ...listing } as Partial<Listing>;
  delete safeListing.address;
  return {
    ...(safeListing as Omit<Listing, "address">),
    location_label: buyerLocationLabel(listing)
  };
}

export function redactKnownListingAddresses(text: string, listings: Array<Pick<Listing, "address" | "neighborhood">>) {
  return listings.reduce((current, listing) => {
    if (!listing.address.trim()) return current;
    return current.replace(new RegExp(escapeRegExp(listing.address), "gi"), buyerLocationLabel(listing));
  }, text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
