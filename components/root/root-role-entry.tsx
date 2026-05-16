"use client";

import { Fragment, useState } from "react";
import { ArrowRight, Building2, Home, KeyRound } from "lucide-react";
import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { Button, LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/formatting";

type Role = "buyer" | "seller" | "agent";

const roles: Array<{
  id: Role;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: "buyer",
    title: "Buy a home",
    description: "Open the buyer link your agent shared.",
    icon: <Home size={20} />
  },
  {
    id: "seller",
    title: "Sell a home",
    description: "Send a seller inquiry to your agent.",
    icon: <Building2 size={20} />
  },
  {
    id: "agent",
    title: "I am an agent",
    description: "Sign in or create your agent link.",
    icon: <KeyRound size={20} />
  }
];

export function RootRoleEntry({
  signedInAgent
}: {
  signedInAgent?: { name: string; slug: string } | null;
}) {
  const [role, setRole] = useState<Role | null>(null);

  return (
    <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-4xl flex-col justify-center px-5 py-10">
      <header className="mb-10 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-warm-muted">Memoir</p>
        {signedInAgent ? (
          <Link
            className="agent-focus rounded-full border border-warm-border bg-white px-4 py-2 text-sm font-semibold text-warm-text"
            href="/dashboard/leads"
          >
            Continue to dashboard
          </Link>
        ) : null}
      </header>

      <main>
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold text-[var(--agent-accent)]">Welcome</p>
          <h1 className="font-serif text-5xl leading-none text-warm-text sm:text-6xl">
            What are you here to do?
          </h1>
          <p className="mt-5 text-lg leading-8 text-warm-muted">
            Choose the path that matches you. Buyers and sellers will need the exact agent link or code.
          </p>
        </div>

        <fieldset className="mt-8">
          <legend className="sr-only">Choose your path</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {roles.map((item) => (
              <Fragment key={item.id}>
                <button
                  className={cn(
                    "agent-focus min-h-28 w-full rounded-2xl border bg-white/75 p-5 text-left transition hover:bg-white",
                    role === item.id
                      ? "border-[var(--agent-accent)] shadow-soft"
                      : "border-warm-border"
                  )}
                  type="button"
                  aria-pressed={role === item.id}
                  onClick={() => setRole(item.id)}
                >
                  <span className="text-[var(--agent-accent)]">{item.icon}</span>
                  <span className="mt-4 block text-base font-semibold text-warm-text">{item.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-warm-muted">{item.description}</span>
                </button>
                {role === item.id ? (
                  <div className="md:order-last md:col-span-3 md:mt-5">
                    <RolePanel role={role} />
                  </div>
                ) : null}
              </Fragment>
            ))}
          </div>
        </fieldset>
      </main>
    </div>
  );
}

function RolePanel({ role }: { role: Role }) {
  if (role === "buyer") return <AgentLinkPanel intent="buyer" />;
  if (role === "seller") return <AgentLinkPanel intent="seller" />;

  return (
    <div className="max-w-md rounded-2xl border border-warm-border bg-white/80 p-5 shadow-soft">
      <SignupForm embedded />
    </div>
  );
}

function AgentLinkPanel({ intent }: { intent: "buyer" | "seller" }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<{ slug: string; name: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    setResolved(null);

    const response = await fetch("/api/agents/resolve-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value })
    });
    const json = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(json.error ?? "We could not find that agent link. Check the spelling or ask your agent.");
      return;
    }

    setResolved(json.agent);
  }
  const destination = resolved ? (intent === "buyer" ? `/${resolved.slug}` : `/${resolved.slug}/seller`) : null;
  return (
    <form
      className="max-w-xl rounded-2xl border border-warm-border bg-white/80 p-5 shadow-soft"
      onSubmit={submit}
    >
      <h2 className="font-serif text-3xl leading-tight">
        {intent === "buyer" ? "Open your agent's buyer page." : "Start a seller inquiry."}
      </h2>
      <label className="mt-5 block">
        <span className="text-sm font-semibold">Agent link or code</span>
        <input
          className="mt-2 h-14 w-full rounded-2xl border-warm-border bg-white px-4 text-base outline-none focus:border-[var(--agent-accent)] focus:ring-[var(--agent-accent-soft)]"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setResolved(null);
            setError(null);
          }}
          placeholder="maya or https://example.com/maya"
        />
      </label>
      <div aria-live="polite" className="mt-3 min-h-6 text-sm">
        {error ? <p className="text-red-700">{error}</p> : null}
        {resolved ? <p className="text-warm-muted">Found {resolved.name}. Continue when ready.</p> : null}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button className="gap-2" disabled={loading || !value.trim()}>
          {loading ? "Checking..." : "Check link"}
          <ArrowRight size={18} />
        </Button>
        {resolved && destination ? (
          <LinkButton className="gap-2" href={destination} variant="secondary">
            Continue to {resolved.name}
            <ArrowRight size={18} />
          </LinkButton>
        ) : null}
      </div>
    </form>
  );
}
