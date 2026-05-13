"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSessionId } from "@/hooks/use-session-id";
import { useTrackEvent } from "@/hooks/use-track-event";
import { firstName } from "@/lib/formatting";
import { isValidEmail, normalizePhone } from "@/lib/phone";
import type { Agent } from "@/lib/types";

function absoluteHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function cleanDraftAnswers(answers: Record<string, unknown> | undefined) {
  const next = { ...(answers ?? { answered_question_ids: [] }) };
  const preapprovalUrl = absoluteHttpUrl(next.preapproval_url);
  if (preapprovalUrl) next.preapproval_url = preapprovalUrl;
  else delete next.preapproval_url;
  return next;
}

export function ContactGateForm({ agent }: { agent: Agent }) {
  const router = useRouter();
  const sessionId = useSessionId();
  const track = useTrackEvent(agent.slug);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const storageKey = useMemo(() => (sessionId ? `intake:${agent.slug}:${sessionId}` : ""), [agent.slug, sessionId]);

  useEffect(() => {
    track("contact_gate_viewed");
  }, [track]);

  const valid = Boolean(normalizePhone(phone) && isValidEmail(email));

  async function submit() {
    if (!valid || !sessionId || !storageKey) return;
    setSubmitting(true);
    setError("");
    let draft: { answers?: Record<string, unknown> } = {};
    try {
      draft = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as {
        answers?: Record<string, unknown>;
      };
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    const preferences = cleanDraftAnswers(draft.answers);
    const preapprovalUrl = absoluteHttpUrl(preferences.preapproval_url);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_slug: agent.slug,
        session_id: sessionId,
        first_name: buyerName || null,
        phone,
        email,
        preferences,
        free_text_raw: typeof preferences.free_text_raw === "string" ? preferences.free_text_raw : null,
        preapproval_url: preapprovalUrl
      })
    }).catch(() => null);

    if (!response?.ok) {
      setSubmitting(false);
      setError("We could not create your match list. Please check your details and try again.");
      return;
    }

    const data = (await response.json()) as { lead?: { id: string } };
    if (!data.lead?.id) {
      setSubmitting(false);
      setError("We could not create your match list. Please try again.");
      return;
    }
    window.localStorage.setItem(`lead:${agent.slug}:${sessionId}`, data.lead.id);
    router.push(`/${agent.slug}/matches`);
  }

  return (
    <div className="flex min-h-svh flex-col justify-center py-10">
      <p className="mb-4 text-sm font-semibold text-[var(--agent-accent)]">Your matches are ready</p>
      <h1 className="break-words font-serif text-4xl leading-[1.02] sm:text-5xl">See your matches</h1>
      <p className="mt-5 text-base leading-7 text-warm-muted">
        {firstName(agent.name)} curates listings personally. Your matches are ready.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">First name</span>
          <input
            type="text"
            autoComplete="given-name"
            value={buyerName}
            onChange={(event) => setBuyerName(event.target.value)}
            className="agent-focus tap-target w-full rounded-2xl border border-warm-border bg-white/75 px-4"
            placeholder="Sarah"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Phone</span>
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            className="agent-focus tap-target w-full rounded-2xl border border-warm-border bg-white/75 px-4"
            placeholder="(512) 555-0141"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            inputMode="email"
            className="agent-focus tap-target w-full rounded-2xl border border-warm-border bg-white/75 px-4"
            placeholder="you@example.com"
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-4 rounded-2xl border border-warm-border bg-white/80 p-3 text-sm text-warm-text">
          {error}
        </p>
      ) : null}

      <Button className="mt-6 w-full gap-2" disabled={!valid || submitting} onClick={submit}>
        {submitting ? `${firstName(agent.name)} is picking your matches...` : "Show me homes"}
        <ArrowRight size={18} />
      </Button>
      <p className="mt-4 text-center text-xs leading-5 text-warm-muted">
        {firstName(agent.name)} may text or email you about matching listings. Unsubscribe anytime.
      </p>
    </div>
  );
}
