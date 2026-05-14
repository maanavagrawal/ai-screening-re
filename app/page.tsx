import { headers } from "next/headers";
import { ArrowRight, Check, Link as LinkIcon } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export default async function Home() {
  const origin = (await requestOrigin()) ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://yourapp.com";
  const exampleUrl = `${origin.replace(/\/$/, "")}/your-name`;

  return (
    <main className="min-h-svh px-5 py-6 lg:px-10">
      <section className="mx-auto grid min-h-[calc(100svh-3rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold text-[var(--agent-accent)]">Agent setup</p>
          <h1 className="font-serif text-5xl leading-none text-warm-text sm:text-6xl">
            Set up your personal buyer link.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-warm-muted">
            Build your profile, add your first listings, verify your phone, then share one simple link in your Instagram or TikTok bio.
          </p>
          <div className="mt-7 rounded-2xl border border-warm-border bg-white/80 p-4 shadow-soft">
            <p className="flex items-center gap-2 text-sm font-semibold text-warm-muted">
              <LinkIcon size={16} />
              Your finished buyer link
            </p>
            <p className="mt-2 break-all font-semibold text-warm-text">{exampleUrl}</p>
          </div>
          <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
            {["Personal profile", "Buyer intake", "Dashboard inbox"].map((item) => (
              <p key={item} className="flex items-center gap-2 rounded-2xl border border-warm-border bg-white/60 px-4 py-3 font-semibold">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--agent-accent-soft)] text-[var(--agent-accent)]">
                  <Check size={14} />
                </span>
                {item}
              </p>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton className="gap-2" href="/signup">
              Start setup
              <ArrowRight size={18} />
            </LinkButton>
            <LinkButton variant="secondary" href="/dashboard">
              Open dashboard
            </LinkButton>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-warm-border bg-[#FAFAF7] shadow-soft">
          <div className="flex items-center justify-between border-b border-warm-border px-4 py-3">
            <span className="text-sm font-semibold">Buyer page preview</span>
            <span className="rounded-full bg-[var(--agent-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--agent-accent)]">
              /your-name
            </span>
          </div>
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-[var(--agent-accent-soft)]" />
              <div>
                <div className="h-3 w-24 rounded-full bg-warm-border" />
                <div className="mt-2 h-3 w-32 rounded-full bg-warm-border" />
              </div>
            </div>
            <div>
              <div className="h-8 w-5/6 rounded-full bg-warm-text/90" />
              <div className="mt-3 h-3 w-4/5 rounded-full bg-warm-border" />
              <div className="mt-2 h-3 w-2/3 rounded-full bg-warm-border" />
            </div>
            <div className="grid gap-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-warm-border bg-white p-3">
                  <div className="h-16 w-16 rounded-xl bg-[var(--agent-accent-soft)]" />
                  <div className="flex-1">
                    <div className="h-3 w-24 rounded-full bg-warm-text/80" />
                    <div className="mt-2 h-3 w-full rounded-full bg-warm-border" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-12 rounded-2xl bg-[var(--agent-accent)]" />
          </div>
        </div>
      </section>
    </main>
  );
}

async function requestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return undefined;
  const protocol = headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("10.") ? "http" : "https");
  return `${protocol}://${host}`;
}
