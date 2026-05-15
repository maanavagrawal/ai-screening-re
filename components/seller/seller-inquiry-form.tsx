"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSessionId } from "@/hooks/use-session-id";

type AgentSummary = {
  slug: string;
  name: string;
  market: string;
  email: string | null;
};

export function SellerInquiryForm({ agent }: { agent: AgentSummary }) {
  const sessionId = useSessionId();
  const [form, setForm] = useState({
    first_name: "",
    phone: "",
    email: "",
    property_address: "",
    neighborhood: "",
    timeframe: "1_3_months",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    const response = await fetch("/api/seller-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_slug: agent.slug,
        session_id: sessionId,
        ...form
      })
    });
    const json = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(json.error ?? "Unable to send seller inquiry");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-svh flex-col justify-center py-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--agent-accent-soft)] text-[var(--agent-accent)]">
          <CheckCircle2 size={24} />
        </div>
        <h1 className="mt-6 font-serif text-5xl leading-none">Sent to {agent.name}.</h1>
        <p className="mt-5 text-lg leading-8 text-warm-muted">
          They have your property notes and contact info. You can expect a practical next step from here.
        </p>
        <Link
          className="agent-focus mt-8 inline-flex min-h-12 items-center justify-center rounded-2xl border border-warm-border bg-white px-5 py-3 text-sm font-semibold"
          href={`/${agent.slug}`}
        >
          View buyer page
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col justify-center py-10">
      <span data-testid="seller-form-ready" className="sr-only">
        {sessionId ? "ready" : "loading"}
      </span>
      <header>
        <p className="text-sm font-semibold text-[var(--agent-accent)]">Seller inquiry</p>
        <h1 className="mt-4 font-serif text-5xl leading-none">Thinking about selling?</h1>
        <p className="mt-5 text-lg leading-8 text-warm-muted">
          Send {agent.name} the basics. They will follow up with what is realistic for {agent.market}.
        </p>
      </header>

      <form className="mt-8 space-y-5" onSubmit={submit}>
        <TextInput label="First name" value={form.first_name} onChange={(first_name) => setForm({ ...form, first_name })} required />
        <TextInput label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required />
        <TextInput label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} required />
        <TextInput label="Property address" value={form.property_address} onChange={(property_address) => setForm({ ...form, property_address })} />
        <TextInput label="Neighborhood" value={form.neighborhood} onChange={(neighborhood) => setForm({ ...form, neighborhood })} />
        <label className="block">
          <span className="text-sm font-semibold">Timeframe</span>
          <select
            className="mt-2 h-14 w-full rounded-2xl border-warm-border bg-white px-4 text-base outline-none focus:border-[var(--agent-accent)] focus:ring-[var(--agent-accent-soft)]"
            value={form.timeframe}
            onChange={(event) => setForm({ ...form, timeframe: event.target.value })}
          >
            <option value="asap">As soon as possible</option>
            <option value="1_3_months">1-3 months</option>
            <option value="3_6_months">3-6 months</option>
            <option value="6_plus_months">6+ months</option>
            <option value="just_curious">Just curious</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Notes</span>
          <textarea
            className="mt-2 min-h-28 w-full rounded-2xl border-warm-border bg-white px-4 py-3 text-base outline-none focus:border-[var(--agent-accent)] focus:ring-[var(--agent-accent-soft)]"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            placeholder="What are you trying to figure out?"
          />
        </label>
        {error ? <p aria-live="polite" className="text-sm text-red-700">{error}</p> : null}
        <Button className="w-full gap-2" disabled={loading || !sessionId}>
          {loading ? "Sending..." : "Send to agent"}
          <ArrowRight size={18} />
        </Button>
      </form>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        className="mt-2 h-14 w-full rounded-2xl border-warm-border bg-white px-4 text-base outline-none focus:border-[var(--agent-accent)] focus:ring-[var(--agent-accent-soft)]"
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
