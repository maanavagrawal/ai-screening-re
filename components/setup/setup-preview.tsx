"use client";

import Image from "next/image";
import type { AgentSetupDraftData, ListingPayload } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";

export function SetupPreview({ draft }: { draft: Partial<AgentSetupDraftData> }) {
  const firstName = draft.name?.split(/\s+/)[0] || "Your";
  const listings = draft.listings ?? [];
  return (
    <aside className="hidden min-h-svh border-l border-warm-border bg-white/45 p-8 lg:block">
      <div className="sticky top-8 mx-auto max-w-sm rounded-[2rem] border border-warm-border bg-[#FAFAF7] p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-white">
            {draft.headshotUrl ? (
              <Image src={draft.headshotUrl} alt="" fill sizes="48px" className="object-cover" />
            ) : null}
          </div>
          <div>
            <p className="text-sm font-semibold">{draft.name || "Your name"}</p>
            <p className="text-xs text-warm-muted">{draft.market || "Your market"}</p>
          </div>
        </div>
        <div className="py-9">
          <p className="mb-3 text-sm text-warm-muted">{draft.bio || "Your one-line bio will appear here."}</p>
          <h2 className="font-serif text-4xl leading-none">
            {draft.headline || `Find your home in ${draft.market || "your city"}, with ${firstName}.`}
          </h2>
          <p className="mt-5 text-warm-muted">
            {draft.subHeadline || "Curated listings. Personally shown. Off-market access."}
          </p>
        </div>
        <div className="space-y-3">
          {(listings.length ? listings : placeholderListings).slice(0, 3).map((listing, index) => (
            <PreviewListing key={`${listing.address}-${index}`} listing={listing} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function PreviewListing({ listing }: { listing: Partial<ListingPayload> }) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-4">
      <p className="font-serif text-2xl">{listing.price ? formatCurrency(listing.price) : "$---"}</p>
      <p className="mt-2 text-xs text-warm-muted">
        {listing.beds ?? "-"} beds • {listing.baths ?? "-"} baths • {listing.neighborhood || "Neighborhood"}
      </p>
      <p className="mt-1 truncate text-xs text-warm-muted">{listing.address || "Listing address"}</p>
    </div>
  );
}

const placeholderListings: Array<Partial<ListingPayload>> = [
  { address: "Your first listing", neighborhood: "Preview", beds: 3, baths: 2 },
  { address: "Your second listing", neighborhood: "Preview", beds: 2, baths: 2 },
  { address: "Your third listing", neighborhood: "Preview", beds: 4, baths: 3 }
];

