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

export function MatchesFeed({ agent, initialLeadId }: { agent: Agent; initialLeadId?: string | null }) {
  const sessionId = useSessionId();
  const [leadId, setLeadId] = useState(initialLeadId ?? "");
  const track = useTrackEvent(agent.slug, leadId || initialLeadId || null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
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
      .then((data: { lead: Lead; matches: Match[] }) => {
        if (!data.lead || !Array.isArray(data.matches)) throw new Error("Matches response was incomplete.");
        const remaining = Math.max(0, 2000 - (Date.now() - started));
        window.setTimeout(() => {
          if (cancelled) return;
          setLead(data.lead);
          setMatches(data.matches);
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

  return (
    <div className="min-h-svh py-5">
      <header className="mb-5">
        <p className="text-sm text-warm-muted">{firstName(agent.name)} picked {matches.length} homes</p>
        <h1 className="mt-2 font-serif text-4xl">Your matches</h1>
      </header>
      <div className="space-y-5">
        {matches.map((match) => (
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
              setMatches((current) => current.filter((item) => item.listing.id !== match.listing.id));
            }}
          />
        ))}
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
