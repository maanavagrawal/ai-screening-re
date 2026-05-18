"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ListingCard } from "@/components/matches/listing-card";
import { RequestShowingSheet } from "@/components/showing/request-showing-sheet";
import { useSessionId } from "@/hooks/use-session-id";
import { useTrackEvent } from "@/hooks/use-track-event";
import { firstName } from "@/lib/formatting";
import type { Agent, Lead, Listing } from "@/lib/types";

type Match = {
  listing: Listing;
  score: number;
  match_reason: string;
};

type MatchesTab = "recommended" | "all";

type MatchesResponse = {
  lead: Lead;
  matches: Match[];
  recommendedMatches?: Match[];
  allMatches?: Match[];
  defaultTab?: MatchesTab;
};

export function MatchesFeed({ agent, initialLeadId }: { agent: Agent; initialLeadId?: string | null }) {
  const sessionId = useSessionId();
  const [leadId, setLeadId] = useState(initialLeadId ?? "");
  const track = useTrackEvent(agent.slug, leadId || initialLeadId || null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [recommendedMatches, setRecommendedMatches] = useState<Match[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<MatchesTab>("recommended");
  const [dismissedListingIds, setDismissedListingIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeListing, setActiveListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (leadId || !sessionId) return;
    setLeadId(window.localStorage.getItem(`lead:${agent.slug}:${sessionId}`) ?? "");
  }, [agent.slug, leadId, sessionId]);

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    const started = Date.now();
    setLoading(true);
    setError("");
    fetch(`/api/matches/${leadId}?agent_slug=${agent.slug}`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load matches.");
        return response.json();
      })
      .then((data: MatchesResponse) => {
        if (!data.lead || !Array.isArray(data.matches)) throw new Error("Matches response was incomplete.");
        const nextRecommended = data.recommendedMatches ?? data.matches;
        const nextAll = data.allMatches ?? data.matches;
        const nextDefaultTab = data.defaultTab ?? (nextRecommended.length > 0 ? "recommended" : "all");
        const remaining = Math.max(0, 2000 - (Date.now() - started));
        window.setTimeout(() => {
          if (cancelled) return;
          setLead(data.lead);
          setRecommendedMatches(nextRecommended);
          setAllMatches(nextAll);
          setActiveTab(nextDefaultTab);
          setDismissedListingIds(new Set());
          setLoading(false);
          track("returned_to_matches", { visit_number: 1 });
        }, remaining);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setError("We could not load these matches. Please start your search again.");
      });
    return () => {
      cancelled = true;
    };
  }, [agent.slug, leadId, track]);

  if (!leadId) {
    return (
      <div className="flex min-h-svh flex-col justify-center py-10 text-center">
        <h1 className="font-serif text-4xl">Your matches need one more step.</h1>
        <a className="mt-6 text-sm font-semibold text-[var(--agent-accent)]" href={`/${agent.slug}/intake`}>
          Start your search
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-svh flex-col justify-center py-10 text-center">
        <h1 className="font-serif text-4xl">Your matches need a refresh.</h1>
        <p role="alert" className="mt-4 text-sm leading-6 text-warm-muted">
          {error}
        </p>
        <a className="mt-6 text-sm font-semibold text-[var(--agent-accent)]" href={`/${agent.slug}/intake?start_over=1`}>
          Start your search
        </a>
      </div>
    );
  }

  if (loading || !lead) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center py-10 text-center">
        <Loader2 className="animate-spin text-[var(--agent-accent)]" size={28} />
        <p className="mt-5 font-serif text-3xl">{firstName(agent.name)} is picking your matches...</p>
      </div>
    );
  }

  const visibleRecommendedMatches = recommendedMatches.filter((match) => !dismissedListingIds.has(match.listing.id));
  const visibleAllMatches = allMatches.filter((match) => !dismissedListingIds.has(match.listing.id));
  const visibleMatches = activeTab === "recommended" ? visibleRecommendedMatches : visibleAllMatches;
  const hasRecommendations = recommendedMatches.length > 0;
  const selectedTabLabel = activeTab === "recommended" ? "Recommended listings" : "All listings";

  function dismissListing(listingId: string) {
    setDismissedListingIds((current) => {
      const next = new Set(current);
      next.add(listingId);
      return next;
    });
  }

  return (
    <div className="min-h-svh py-5">
      <header className="mb-5">
        <p className="text-sm text-warm-muted">
          {hasRecommendations
            ? `${firstName(agent.name)} picked ${recommendedMatches.length} recommended homes`
            : `${firstName(agent.name)} shared ${allMatches.length} homes`}
        </p>
        <h1 className="mt-2 font-serif text-4xl">Your matches</h1>
      </header>

      <div className="mb-5 rounded-2xl border border-warm-border bg-white p-1 shadow-sm" role="tablist" aria-label="Listing views">
        {[
          { id: "recommended" as const, label: "Recommended", count: visibleRecommendedMatches.length },
          { id: "all" as const, label: "All", count: visibleAllMatches.length }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`matches-${tab.id}`}
            id={`matches-tab-${tab.id}`}
            className={`inline-flex min-h-12 w-1/2 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
              activeTab === tab.id ? "bg-warm-text text-white shadow-sm" : "text-warm-muted hover:bg-[#FAFAF7]"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className={activeTab === tab.id ? "text-white/75" : "text-warm-muted"}>{tab.count}</span>
          </button>
        ))}
      </div>

      {!hasRecommendations && activeTab === "all" ? (
        <div className="mb-5 rounded-2xl border border-warm-border bg-[#FAFAF7] p-4 text-sm leading-6 text-warm-muted">
          No strong matches yet, so we are showing all of {firstName(agent.name)}&apos;s listings. You can still browse everything and request a showing for anything that feels close.
        </div>
      ) : null}

      <div
        id={`matches-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`matches-tab-${activeTab}`}
        aria-label={selectedTabLabel}
        className="space-y-5"
      >
        {visibleMatches.length > 0 ? visibleMatches.map((match) => (
          <ListingCard
            key={match.listing.id}
            agent={agent}
            listing={match.listing}
            reason={match.match_reason}
            score={match.score}
            onRequest={() => {
              track("showing_sheet_opened", { listing_id: match.listing.id });
              setActiveListing(match.listing);
            }}
            onDismiss={() => {
              track("listing_dismissed", { listing_id: match.listing.id });
              dismissListing(match.listing.id);
            }}
          />
        )) : (
          <div className="rounded-2xl border border-warm-border bg-white p-5 text-center shadow-sm">
            <p className="font-serif text-2xl">
              {activeTab === "recommended" ? "No recommended homes yet." : "No listings to show."}
            </p>
            <p className="mt-2 text-sm leading-6 text-warm-muted">
              {activeTab === "recommended"
                ? `Try the All tab to browse every home ${firstName(agent.name)} has shared.`
                : `${firstName(agent.name)} has not added active listings yet.`}
            </p>
            {activeTab === "recommended" && visibleAllMatches.length > 0 ? (
              <button
                type="button"
                className="agent-focus mt-4 rounded-full border border-warm-border px-4 py-2 text-sm font-semibold text-warm-text"
                onClick={() => setActiveTab("all")}
              >
                View all listings
              </button>
            ) : null}
          </div>
        )}
      </div>
      {activeListing ? (
        <RequestShowingSheet
          agent={agent}
          lead={lead}
          listing={activeListing}
          onClose={() => setActiveListing(null)}
          onLeadUpdate={setLead}
        />
      ) : null}
    </div>
  );
}
