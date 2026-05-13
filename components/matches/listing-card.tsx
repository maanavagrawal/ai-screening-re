"use client";

import { EyeOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { firstName, formatCurrency } from "@/lib/formatting";
import type { Agent, Listing } from "@/lib/types";

const listingPosters = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"
];

function posterForListing(listing: Listing) {
  const seed = [...listing.address].reduce((total, char) => total + char.charCodeAt(0), 0);
  return listingPosters[seed % listingPosters.length];
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
  const posterUrl = posterForListing(listing);
  const [videoReady, setVideoReady] = useState(false);

  return (
    <article aria-label={`${listing.address} match`} className="min-h-[70svh] overflow-hidden rounded-2xl border border-warm-border bg-white shadow-soft">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#F1EEE8]">
        <Image
          src={posterUrl}
          alt=""
          fill
          priority={listing.is_pocket}
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/[0.03]" />
        {listing.video_url && listing.video_source === "mp4" ? (
          <video
            aria-label={`Video preview of ${listing.address}`}
            src={listing.video_url}
            poster={posterUrl}
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
        ) : (
          <div className="absolute inset-0 flex h-full items-center justify-center p-8 text-center text-sm font-semibold text-white">
            Video preview available on request
          </div>
        )}
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
        <p className="mt-1 text-sm text-warm-muted">{listing.address}</p>
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
          <Button aria-label={`Not for me: ${listing.address}`} variant="secondary" onClick={onDismiss}>
            <EyeOff size={18} />
          </Button>
        </div>
      </div>
    </article>
  );
}
