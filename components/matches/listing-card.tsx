"use client";

import { EyeOff, Home, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { firstName, formatCurrency } from "@/lib/formatting";
import { BUYER_ADDRESS_PLACEHOLDER, buyerLocationLabel } from "@/lib/listing-privacy";
import type { Agent, Listing } from "@/lib/types";

function isStockOrDemoMedia(url: string | null) {
  if (!url) return false;
  return /(?:images\.unsplash\.com|images\.pexels\.com|videos\.pexels\.com)/i.test(url);
}

export function ListingCard({
  agent,
  listing,
  reason,
  score,
  onRequest,
  onDismiss
}: {
  agent: Agent;
  listing: Listing;
  reason: string;
  score: number;
  onRequest: () => void;
  onDismiss: () => void;
}) {
  const badges = [
    score >= 5 ? "Strong fit" : null,
    listing.features[0]?.replaceAll("_", " "),
    listing.beds ? `${listing.beds}BR` : null
  ].filter(Boolean).slice(0, 2);
  const [videoReady, setVideoReady] = useState(false);
  const locationLabel = buyerLocationLabel(listing);
  const canShowVideo = Boolean(
    listing.video_url && listing.video_source === "mp4" && !isStockOrDemoMedia(listing.video_url)
  );

  return (
    <article aria-label={`${locationLabel} match`} className="min-h-[70svh] overflow-hidden rounded-2xl border border-warm-border bg-white shadow-soft">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#F1EEE8]">
        <NoMediaPanel listing={listing} locationLabel={locationLabel} />
        {canShowVideo ? (
          <video
            aria-label={`Video preview for ${locationLabel}`}
            src={listing.video_url ?? undefined}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${videoReady ? "opacity-100" : "opacity-0"}`}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            controls={false}
            onLoadedData={() => setVideoReady(true)}
            onError={() => setVideoReady(false)}
          />
        ) : null}
        {listing.is_pocket ? (
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-[var(--agent-accent)] shadow-sm">
            Off-market — {firstName(agent.name)}&apos;s network only
          </div>
        ) : null}
      </div>
      <div className="p-5">
        <p className="font-serif text-4xl">{formatCurrency(listing.price)}</p>
        <p className="mt-2 text-sm text-warm-muted">
          {listing.beds} beds • {listing.baths} baths{listing.sqft ? ` • ${listing.sqft.toLocaleString()} sqft` : ""} •{" "}
          {listing.neighborhood}
        </p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-warm-border bg-[#FAFAF7] px-3 py-2 text-xs font-semibold text-warm-muted">
          <LockKeyhole size={14} />
          {listing.address === BUYER_ADDRESS_PLACEHOLDER ? BUYER_ADDRESS_PLACEHOLDER : "Exact address withheld"}
        </p>
        <p className="mt-5 border-l-2 border-[var(--agent-accent)] pl-3 text-sm italic leading-6">
          {reason}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span key={badge} className="rounded-full bg-[var(--agent-accent-soft)] px-3 py-1 text-xs font-semibold">
              {badge}
            </span>
          ))}
        </div>
        {listing.agent_note ? (
          <p className="mt-4 text-sm italic leading-6 text-warm-muted">Agent&apos;s take: {listing.agent_note}</p>
        ) : null}
        <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
          <Button onClick={onRequest}>Request a showing</Button>
          <Button aria-label={`Not for me: ${locationLabel}`} variant="secondary" onClick={onDismiss}>
            <EyeOff size={18} />
          </Button>
        </div>
      </div>
    </article>
  );
}

function NoMediaPanel({ listing, locationLabel }: { listing: Listing; locationLabel: string }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-between bg-[#EDE8DE] p-6 text-warm-text">
      <div className="flex justify-between text-xs font-semibold uppercase tracking-[0.16em] text-warm-muted">
        <span>{listing.neighborhood ?? locationLabel}</span>
        <span>{listing.property_type?.replaceAll("_", " ") ?? "Home"}</span>
      </div>
      <div className="rounded-2xl border border-white/70 bg-white/35 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--agent-accent)] shadow-sm">
          <Home size={22} />
        </div>
        <p className="mt-5 font-serif text-4xl leading-none">{locationLabel}</p>
        <p className="mt-3 text-sm leading-6 text-warm-muted">
          {listing.beds} beds • {listing.baths} baths{listing.sqft ? ` • ${listing.sqft.toLocaleString()} sqft` : ""}
        </p>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--agent-accent)]">
          Media pending
        </p>
      </div>
      <p className="text-sm leading-6 text-warm-muted">Real media coming soon.</p>
    </div>
  );
}
