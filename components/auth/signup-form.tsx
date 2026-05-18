"use client";

import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignupForm({
  returnTo,
  embedded = false
}: {
  returnTo?: string | null;
  embedded?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [continueHref, setContinueHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, return_to: returnTo ?? null })
    });
    const json = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(json.error ?? "Unable to send magic link");
      return;
    }
    setSent(true);
    setContinueHref(json.devLink ?? json.redirectTo ?? null);
    if (!embedded && (json.redirectTo || json.devLink)) window.history.replaceState(null, "", "/signup");
  }

  if (sent) {
    const Heading = embedded ? "h2" : "h1";
    return (
      <div className="space-y-5">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--agent-accent-soft)] text-[var(--agent-accent)]">
          <Mail size={22} />
        </div>
        <div>
          <Heading className="font-serif text-5xl leading-none">Check your email</Heading>
          <p className="mt-4 text-warm-muted">
            Your secure sign-in link is on the way. Returning agents go to their dashboard; new agents continue into private-link setup.
          </p>
        </div>
        {continueHref ? (
          <Button className="w-full gap-2" onClick={() => (window.location.href = continueHref)}>
            Continue
            <ArrowRight size={18} />
          </Button>
        ) : null}
      </div>
    );
  }

  const Heading = embedded ? "h2" : "h1";
  return (
    <form className="space-y-6" onSubmit={submit}>
      <div>
        <p className="mb-3 text-sm font-semibold text-[var(--agent-accent)]">Agent access</p>
        <Heading className="font-serif text-5xl leading-none">Sign in or create your agent link</Heading>
        <p className="mt-4 text-warm-muted">
          Returning agent? Enter the same email and we will take you to your dashboard. New here? Use your work email to start your private link setup.
        </p>
      </div>
      <label className="block">
        <span className="text-sm font-semibold">Email</span>
        <input
          className="mt-2 h-14 w-full rounded-2xl border-warm-border bg-white px-4 text-base outline-none focus:border-[var(--agent-accent)] focus:ring-[var(--agent-accent-soft)]"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@brokerage.com"
          required
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button className="w-full gap-2" disabled={loading || !email}>
        {loading ? "Sending..." : "Send secure sign-in link"}
        <ArrowRight size={18} />
      </Button>
      <p className="text-center text-sm leading-6 text-warm-muted">
        No password needed. We recognize returning agents by email.
      </p>
    </form>
  );
}
