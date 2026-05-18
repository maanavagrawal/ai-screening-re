"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  KeyRound,
  LockKeyhole,
  Radio,
  Sparkles,
  Zap
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/formatting";

const privateLinkSignals = [
  "Invite-only client rooms",
  "Buyer and seller routing",
  "Matched-home context",
  "Agent-owned follow-up"
];

const briefRows = [
  { label: "Budget", value: "$900k-$1.3M", tone: "warm" },
  { label: "Timing", value: "Ready this spring", tone: "green" },
  { label: "Areas", value: "Noe Valley, Hayes, Cole", tone: "blue" }
];

const activityFeed = [
  { icon: <Radio size={15} />, title: "Instagram DM", text: "Is this one still worth seeing?" },
  { icon: <ClipboardCheck size={15} />, title: "Buyer brief", text: "Timeline, budget, deal-breakers captured." },
  { icon: <Zap size={15} />, title: "Agent follow-up", text: "Reply framed with matched-home context." }
];

export function RootRoleEntry({
  signedInAgent
}: {
  signedInAgent?: { name: string; slug: string } | null;
}) {
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  return (
    <div className="min-h-svh overflow-hidden bg-[#0E1311] text-[#FFF8EC]">
      <span className="sr-only" data-testid="root-ready">
        {clientReady ? "ready" : "loading"}
      </span>

      <section className="relative isolate min-h-svh">
        <Image
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=85"
          alt="Modern home prepared for a private showing"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(8,12,10,0.97)_0%,rgba(8,12,10,0.88)_38%,rgba(8,12,10,0.48)_68%,rgba(8,12,10,0.26)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,10,0.16)_0%,rgba(8,12,10,0.08)_48%,#0E1311_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <Link className="agent-focus group inline-flex items-center gap-3 rounded-full" href="/" aria-label="Memoir home">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[#E5B96C] shadow-[0_0_40px_rgba(229,185,108,0.18)] backdrop-blur">
                <Sparkles size={18} />
              </span>
              <span>
                <span className="block text-base font-semibold leading-none text-white">Memoir</span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-[#B9C9BF]">Agent client links</span>
              </span>
            </Link>

            {signedInAgent ? (
              <Link
                className="agent-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white hover:text-[#0E1311]"
                href="/dashboard/leads"
              >
                Continue to dashboard
                <ArrowRight size={16} />
              </Link>
            ) : (
              <Link
                className="agent-focus hidden min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white hover:text-[#0E1311] sm:inline-flex"
                href="/signup"
              >
                Agent access
                <ArrowRight size={16} />
              </Link>
            )}
          </header>

          <main className="grid min-w-0 flex-1 items-center gap-8 py-10 md:grid-cols-[minmax(0,0.95fr)_minmax(20rem,0.72fr)] md:items-start md:py-10 lg:grid-cols-[minmax(0,0.94fr)_minmax(24rem,0.68fr)] lg:gap-10 lg:py-12">
            <section className="min-w-0 max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#F3E6D5] shadow-[0_14px_60px_rgba(0,0,0,0.25)] backdrop-blur">
                <LockKeyhole size={14} />
                Invite-only links for high-touch agents
              </div>

              <h1 className="mt-7 max-w-full text-balance break-words font-serif text-5xl leading-[0.94] tracking-normal text-white sm:text-6xl xl:text-[5.6rem] 2xl:text-[6.3rem]">
                Private agent links for serious real estate leads.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#E6DED2] sm:text-xl sm:leading-9">
                Memoir turns your bio link, open-house QR, or text reply into a polished client room that captures buyer and seller context before the first call.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="agent-focus inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#F1EEE6] px-6 py-3 text-base font-semibold text-[#0E1311] shadow-[0_18px_55px_rgba(241,238,230,0.2)] transition hover:bg-white"
                  href="/signup"
                >
                  Get your private link
                  <ArrowRight size={18} />
                </Link>
                <Link
                  className="agent-focus inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur transition hover:bg-white hover:text-[#0E1311]"
                  href="#how-it-works"
                >
                  See how it works
                  <ChevronRight size={18} />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {privateLinkSignals.map((signal) => (
                  <span key={signal} className="rounded-full border border-white/15 bg-black/25 px-3 py-2 text-xs font-semibold text-[#F7ECDE] backdrop-blur">
                    {signal}
                  </span>
                ))}
              </div>
            </section>

            <section aria-label="Memoir private link preview" className="min-w-0 max-w-full">
              <div className="relative min-w-0 rounded-[2rem] border border-white/20 bg-[#F7F0E4]/96 p-3 text-[#131816] shadow-[0_34px_110px_rgba(0,0,0,0.48)] backdrop-blur-xl">
                <div className="absolute -left-6 top-10 hidden rounded-2xl border border-white/20 bg-[#17231E]/90 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_70px_rgba(0,0,0,0.34)] backdrop-blur xl:block">
                  <span className="block text-xs uppercase tracking-wide text-[#91C8BA]">Lead quality</span>
                  <span className="mt-1 block font-serif text-3xl leading-none">High</span>
                </div>

                <div className="memoir-float rounded-[1.45rem] border border-[#D9CCBA] bg-[#FFFDF7] p-4 sm:p-5">
                  <div className="relative min-h-14 pr-24">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#887B68]">Live private link</p>
                      <h2 className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap font-serif text-[clamp(1.7rem,3vw,2.35rem)] leading-none">memoir.link/maya</h2>
                    </div>
                    <span className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-full bg-[#E6F2EA] px-3 py-1.5 text-xs font-semibold text-[#315C46]">
                      <BadgeCheck size={14} />
                      Active
                    </span>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-3xl border border-[#E4D9C8] bg-[#111816]">
                    <div className="relative h-44">
                      <Image
                        src="https://images.unsplash.com/photo-1600566753151-384129cf4e3e?auto=format&fit=crop&w=1000&q=80"
                        alt="Curated home interior preview"
                        fill
                        sizes="(min-width: 1024px) 32rem, 100vw"
                        className="object-cover opacity-[0.82]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,22,0.04),rgba(17,24,22,0.72))]" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#D9E9DE]">Client room</p>
                        <p className="mt-1 font-serif text-3xl leading-none text-white">Maya&apos;s matched homes</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {briefRows.map((row) => (
                      <div key={row.label} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 rounded-2xl border border-[#E7DED0] bg-[#FBF7F0] px-3 py-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#887B68]">{row.label}</span>
                        <span
                          className={cn(
                            "justify-self-end rounded-full px-3 py-1.5 text-sm font-semibold",
                            row.tone === "warm" && "bg-[#F4DED2] text-[#83472E]",
                            row.tone === "green" && "bg-[#E4F1E6] text-[#315C46]",
                            row.tone === "blue" && "bg-[#DEEAF2] text-[#31506C]"
                          )}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-[#E7DED0] bg-[#111816] px-4 py-3 text-[#FFF8EC]">
                    <div className="memoir-marquee flex min-w-max gap-8 text-sm font-semibold">
                      <span>New buyer brief captured</span>
                      <span className="text-[#91C8BA]">3 matched homes ready</span>
                      <span className="text-[#E5B96C]">Showing intent high</span>
                      <span>Seller lead routed</span>
                      <span aria-hidden="true">New buyer brief captured</span>
                      <span aria-hidden="true" className="text-[#91C8BA]">3 matched homes ready</span>
                      <span aria-hidden="true" className="text-[#E5B96C]">Showing intent high</span>
                      <span aria-hidden="true">Seller lead routed</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-[1.45rem] border border-[#26352F] bg-[#101815] p-4 text-white">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#91C8BA]">
                      <KeyRound size={19} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#AFC3B8]">Agent access</p>
                      <h3 className="mt-1 font-serif text-3xl leading-none tracking-normal">Create your private link.</h3>
                      <p className="mt-2 text-sm leading-6 text-[#AFC3B8]">
                        Sign in, set up your listings, then share your branded URL with buyers and sellers.
                      </p>
                    </div>
                  </div>
                  <Link
                    className="agent-focus mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#F1EEE6] px-5 py-3 text-sm font-semibold text-[#101815] transition hover:bg-white"
                    href="/signup"
                  >
                    Sign in or create link
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </section>
          </main>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 border-t border-white/10 bg-[#0E1311] px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#91C8BA]">From interest to action</p>
            <h2 className="mt-3 max-w-lg font-serif text-4xl leading-[1.02] tracking-normal text-white sm:text-5xl">
              A private link that feels polished and works like qualification.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#B9C9BF]">
              Buyers and sellers get a guided room that feels personal. Agents get the context they need to reply with confidence instead of chasing half-complete DMs.
            </p>
          </div>

          <div className="grid gap-4">
            {activityFeed.map((step, index) => (
              <article key={step.title} className="grid gap-4 border-t border-white/10 py-5 sm:grid-cols-[4rem_1fr_auto] sm:items-center">
                <span className="font-serif text-4xl leading-none text-[#E5B96C]">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <span className="flex items-center gap-2 font-semibold text-white">
                    <span className="text-[#91C8BA]">{step.icon}</span>
                    {step.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[#B9C9BF]">{step.text}</span>
                </span>
                <CheckCircle2 className="hidden text-[#91C8BA] sm:block" size={21} />
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
