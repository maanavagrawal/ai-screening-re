"use client";

import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const json = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(json.error ?? "Unable to send magic link");
      return;
    }
    setSent(true);
    if (json.redirectTo) window.history.replaceState(null, "", "/signup");
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--agent-accent-soft)] text-[var(--agent-accent)]">
          <Mail size={22} />
        </div>
        <div>
          <h1 className="font-serif text-5xl leading-none">Check your email</h1>
          <p className="mt-4 text-warm-muted">
            Your setup link is on the way. In local preview, you can continue now.
          </p>
        </div>
        <Button className="w-full gap-2" onClick={() => (window.location.href = "/setup/welcome")}>
          Continue setup
          <ArrowRight size={18} />
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div>
        <p className="mb-3 text-sm font-semibold text-[var(--agent-accent)]">Agent setup</p>
        <h1 className="font-serif text-5xl leading-none">Launch your buyer link</h1>
        <p className="mt-4 text-warm-muted">
          Magic link only. No passwords, no CRM migration, no setup maze.
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
        {loading ? "Sending..." : "Send magic link"}
        <ArrowRight size={18} />
      </Button>
    </form>
  );
}

