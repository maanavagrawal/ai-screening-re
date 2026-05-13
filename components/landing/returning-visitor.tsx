import { ArrowRight, RotateCcw } from "lucide-react";
import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import type { Agent, Lead } from "@/lib/types";
import { firstName } from "@/lib/formatting";

export function ReturningVisitor({
  agent,
  lead,
  summary
}: {
  agent: Agent;
  lead: Lead;
  summary: string;
}) {
  const buyerName = lead.first_name || "there";
  return (
    <div className="flex min-h-svh flex-col justify-center py-10">
      <div className="mb-10 flex items-center gap-3">
        {agent.headshot_url ? (
          <Image
            src={agent.headshot_url}
            alt={agent.name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : null}
        <div>
          <p className="text-sm font-semibold">{agent.name}</p>
          <p className="text-sm text-warm-muted">{agent.market}</p>
        </div>
      </div>
      <p className="text-sm text-warm-muted">{firstName(agent.name)} kept your search warm.</p>
      <h1 className="mt-4 break-words font-serif text-4xl leading-[1.02] sm:text-5xl">Welcome back, {buyerName}</h1>
      <p className="mt-6 text-lg leading-7 text-warm-muted">{summary}</p>
      <div className="mt-10 space-y-3">
        <LinkButton href={`/${agent.slug}/matches`} className="w-full gap-2">
          See what&apos;s new
          <ArrowRight size={18} />
        </LinkButton>
        <LinkButton href={`/${agent.slug}/intake?start_over=1`} variant="ghost" className="w-full gap-2">
          <RotateCcw size={17} />
          Start over
        </LinkButton>
      </div>
    </div>
  );
}
