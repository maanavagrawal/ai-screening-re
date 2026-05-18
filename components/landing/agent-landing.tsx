import { ArrowRight, ClipboardCheck, Home, LockKeyhole, MessageSquareText, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import type { Agent, Listing } from "@/lib/types";
import { firstName, formatClosedVolume, formatCurrency } from "@/lib/formatting";
import { BUYER_ADDRESS_PLACEHOLDER, buyerLocationLabel } from "@/lib/listing-privacy";

export function AgentLanding({
  agent,
  listings
}: {
  agent: Agent;
  listings: Listing[];
}) {
  const name = firstName(agent.name);
  const trust = formatClosedVolume(agent.closed_volume_usd);
  const trustParts = [
    trust ? `${trust} closed` : null,
    agent.buyers_placed > 0 ? `${agent.buyers_placed} buyers placed` : null
  ].filter(Boolean);
  const previewListings = listings.slice(0, 3);
  const briefSteps = [
    {
      icon: <ClipboardCheck size={17} />,
      label: "Share your search",
      text: "Budget, timing, areas, must-haves, and tradeoffs."
    },
    {
      icon: <Home size={17} />,
      label: "Unlock matched homes",
      text: `${name} sees what matters before sending options.`
    },
    {
      icon: <MessageSquareText size={17} />,
      label: "Get useful follow-up",
      text: "Ask for showings or refine your brief when a home is close."
    }
  ];

  if (agent.paused) {
    return (
      <div className="flex min-h-svh flex-col justify-center py-10">
        <header className="flex items-center gap-3">
          {agent.headshot_url ? (
            <Image
              src={agent.headshot_url}
              alt={agent.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover ring-1 ring-warm-border"
            />
          ) : null}
          <div>
            <p className="text-sm font-semibold">{agent.name}</p>
            <p className="text-sm text-warm-muted">{agent.market}</p>
          </div>
        </header>
        <h1 className="mt-10 font-serif text-5xl leading-none">Currently accepting limited inquiries.</h1>
        <p className="mt-5 text-warm-muted">Please email {agent.email ?? name} directly for the fastest response.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col pt-6">
      <header className="flex items-center gap-3">
        {agent.headshot_url ? (
          <Image
            src={agent.headshot_url}
            alt={agent.name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover ring-1 ring-warm-border"
          />
        ) : null}
        <div>
          <p className="text-sm font-semibold">{agent.name}</p>
          <p className="text-sm text-warm-muted">{agent.market}</p>
        </div>
      </header>

      <section className="py-9">
        <p className="mb-4 text-sm font-semibold text-[var(--agent-accent)]">Private buyer link</p>
        <h1 className="break-words font-serif text-4xl leading-[0.98] tracking-normal text-warm-text sm:text-5xl">
          Tell {name} what you want. Get homes that fit.
        </h1>
        <p className="mt-6 text-lg leading-7 text-warm-muted">
          Answer a quick buyer brief about timing, budget, neighborhoods, and must-haves. {name} uses it to match homes and follow up with next steps.
        </p>

        {agent.headline || agent.sub_headline ? (
          <div className="mt-6 rounded-3xl border border-warm-border bg-white/75 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-warm-muted">From {name}</p>
            <p className="mt-2 text-base leading-6 text-warm-text">
              {agent.headline || agent.sub_headline}
            </p>
          </div>
        ) : null}

        {trustParts.length ? (
          <p className="mt-4 rounded-full border border-warm-border bg-white/70 px-4 py-3 text-center text-sm text-warm-muted">
            {trustParts.join(" • ")}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          <LinkButton className="w-full gap-2" href={`/${agent.slug}/intake`}>
            Start buyer brief
            <ArrowRight size={18} />
          </LinkButton>
          <a className="block text-center text-sm font-semibold text-warm-muted" href={`/${agent.slug}/seller`}>
            Selling instead? Send seller details
          </a>
        </div>
      </section>

      <section className="rounded-3xl border border-warm-border bg-white/75 p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-warm-muted">What happens next</p>
        <div className="mt-4 divide-y divide-warm-border">
          {briefSteps.map((step) => (
            <div key={step.label} className="grid grid-cols-[1.75rem_1fr] gap-3 py-4 first:pt-0 last:pb-0">
              <span className="mt-0.5 text-[var(--agent-accent)]">{step.icon}</span>
              <span>
                <span className="block font-semibold text-warm-text">{step.label}</span>
                <span className="mt-1 block text-sm leading-6 text-warm-muted">{step.text}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-warm-muted">Preview matches</p>
            <h2 className="mt-1 font-serif text-3xl leading-tight">Homes stay private until you start.</h2>
          </div>
          <ShieldCheck className="mb-1 shrink-0 text-[var(--agent-accent)]" size={23} aria-hidden="true" />
        </div>
        <div className="mt-4 space-y-3">
          {previewListings.length ? previewListings.map((listing) => (
            <a
              href={`/${agent.slug}/intake`}
              key={listing.id}
              aria-label={`Unlock personalized matches in ${buyerLocationLabel(listing)}`}
              className="agent-focus block rounded-3xl border border-warm-border bg-white/75 p-4 shadow-sm transition hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-3xl leading-none">{formatCurrency(listing.price)}</p>
                  <p className="mt-2 text-sm text-warm-muted">
                    {listing.beds} beds • {listing.baths} baths
                    {listing.neighborhood ? ` • ${listing.neighborhood}` : ""}
                  </p>
                </div>
                <LockKeyhole className="mt-1 shrink-0 text-[var(--agent-accent)]" size={19} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-warm-border bg-[#FAFAF7] px-3 py-3">
                <p className="text-xs font-semibold text-warm-muted">
                  {listing.address === BUYER_ADDRESS_PLACEHOLDER ? BUYER_ADDRESS_PLACEHOLDER : "Exact address withheld"}
                </p>
                <ArrowRight className="shrink-0 text-[var(--agent-accent)]" size={16} />
              </div>
            </a>
          )) : (
            <div className="rounded-3xl border border-warm-border bg-white/75 p-4">
              <p className="font-semibold text-warm-text">Start with your buyer brief.</p>
              <p className="mt-2 text-sm leading-6 text-warm-muted">
                {name} can send the right matches once your budget, timing, and search areas are clear.
              </p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
