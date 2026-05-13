import { ArrowRight, LockKeyhole } from "lucide-react";
import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import type { Agent, Listing } from "@/lib/types";
import { firstName, formatClosedVolume, formatCurrency } from "@/lib/formatting";

export function AgentLanding({
  agent,
  listings
}: {
  agent: Agent;
  listings: Listing[];
}) {
  const name = firstName(agent.name);
  const trust = formatClosedVolume(agent.closed_volume_usd);

  return (
    <div className="flex min-h-svh flex-col pt-8">
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

      <section className="flex flex-1 flex-col justify-center py-12">
        <p className="mb-4 text-sm text-warm-muted">{agent.bio}</p>
        <h1 className="break-words font-serif text-4xl leading-[0.98] tracking-normal text-warm-text sm:text-5xl">
          Find your home in {agent.market}, with {name}.
        </h1>
        <p className="mt-6 text-lg leading-7 text-warm-muted">
          Curated listings. Personally shown. Off-market access.
        </p>
        {trust || agent.buyers_placed > 0 ? (
          <p className="mt-6 rounded-full border border-warm-border px-4 py-3 text-center text-sm text-warm-muted">
            {trust ? `${trust} closed` : ""}
            {trust && agent.buyers_placed > 0 ? " • " : ""}
            {agent.buyers_placed > 0 ? `${agent.buyers_placed} buyers placed` : ""}
          </p>
        ) : null}
      </section>

      <section className="pb-28">
        <div className="space-y-3">
          {listings.slice(0, 3).map((listing) => (
            <a
              href={`/${agent.slug}/intake`}
              key={listing.id}
              aria-label={`Unlock personalized matches starting with ${listing.address}`}
              className="relative block overflow-hidden rounded-2xl border border-warm-border bg-white/70 p-4 shadow-sm"
            >
              <div className="blur-[3px]">
                <p className="font-serif text-2xl">{formatCurrency(listing.price)}</p>
                <p className="mt-2 text-sm text-warm-muted">
                  {listing.beds} beds • {listing.baths} baths • {listing.neighborhood}
                </p>
                <p className="mt-1 text-sm text-warm-muted">{listing.address}</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAF7]/45">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-soft">
                  <LockKeyhole size={15} />
                  Unlock personalized matches
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-warm-border bg-[#FAFAF7]/90 px-5 py-4 backdrop-blur safe-bottom">
        <div className="phone-shell">
          <LinkButton className="w-full gap-2" href={`/${agent.slug}/intake`}>
            Find your next home
            <ArrowRight size={18} />
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
