"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Agent, Lead, Listing } from "@/lib/types";
import { firstName } from "@/lib/formatting";
import { useTrackEvent } from "@/hooks/use-track-event";

export function RequestShowingSheet({
  agent,
  lead,
  listing,
  onClose,
  onLeadUpdate
}: {
  agent: Agent;
  lead: Lead;
  listing: Listing;
  onClose: () => void;
  onLeadUpdate: (lead: Lead) => void;
}) {
  const track = useTrackEvent(agent.slug, lead.id);
  const titleId = useId();
  const codeId = useId();
  const [step, setStep] = useState<"verify" | "schedule" | "confirmed">(lead.phone_verified ? "schedule" : "verify");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [date, setDate] = useState(() => nextDay(6));
  const [time, setTime] = useState<"morning" | "afternoon" | "evening">("afternoon");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendCode() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_slug: agent.slug, lead_id: lead.id, listing_id: listing.id })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Code could not be sent.");
      }
      setCodeSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "We could not send that code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function checkCode() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_slug: agent.slug, lead_id: lead.id, listing_id: listing.id, code })
      });
      if (!response.ok) throw new Error("Code was not accepted.");
      const data = (await response.json()) as { lead: Lead };
      onLeadUpdate(data.lead);
      setStep("schedule");
    } catch {
      setError("That code did not work. Please check it and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitShowing() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/showing-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_slug: agent.slug,
          lead_id: lead.id,
          listing_id: listing.id,
          preferred_date: date,
          preferred_time_of_day: time,
          note
        })
      });
      if (!response.ok) throw new Error("Showing request failed.");
      setStep("confirmed");
    } catch {
      setError("We could not request that time. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function closeWithSignal() {
    if (step === "verify") {
      track("showing_verification_abandoned", { listing_id: listing.id });
      track("abandoned_showing_request", { listing_id: listing.id, step: "verify" });
    }
    if (step === "schedule") {
      track("abandoned_showing_request", { listing_id: listing.id, step: "schedule" });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/20 px-3 pb-3 pt-6 sm:items-center sm:py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="phone-shell max-h-[calc(100svh-2rem)] overflow-y-auto rounded-[1.75rem] bg-[#FAFAF7] p-5 shadow-soft"
      >
        <div className="mb-3 flex justify-end">
          <button aria-label="Close showing request" onClick={closeWithSignal} className="agent-focus rounded-full p-2">
            <X size={20} />
          </button>
        </div>
        {step === "verify" ? (
          <div>
            <h2 id={titleId} className="font-serif text-3xl">Quick check before scheduling</h2>
            <p className="mt-3 text-sm leading-6 text-warm-muted">
              {firstName(agent.name)} needs to confirm your number. We&apos;ll text a 6-digit code.
            </p>
            <p className="mt-4 rounded-2xl border border-warm-border bg-white/70 p-4 text-sm">{lead.phone}</p>
            <Button className="mt-4 w-full" disabled={busy} onClick={sendCode}>
              {codeSent ? "Send again" : "Send code"}
            </Button>
            {codeSent ? (
              <div className="mt-4">
                <label htmlFor={codeId} className="sr-only">
                  Verification code
                </label>
                <input
                  id={codeId}
                  aria-label="Verification code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  className="agent-focus tap-target w-full rounded-2xl border border-warm-border bg-white/80 px-4 text-center text-2xl tracking-[0.35em]"
                  placeholder="123456"
                />
                <Button className="mt-4 w-full" disabled={code.length < 6 || busy} onClick={checkCode}>
                  Verify and continue
                </Button>
              </div>
            ) : null}
            {error ? <p role="alert" className="mt-4 text-sm leading-6 text-warm-muted">{error}</p> : null}
          </div>
        ) : step === "schedule" ? (
          <div>
            <h2 id={titleId} className="font-serif text-3xl">When works for you?</h2>
            <div className="mt-5 grid grid-cols-3 gap-2" role="group" aria-label="Preferred date">
              {[nextDay(6), nextDay(0), nextDay(3)].map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={date === item}
                  onClick={() => setDate(item)}
                  className="agent-focus rounded-2xl border px-2 py-3 text-sm font-semibold"
                  style={{
                    borderColor: date === item ? "var(--agent-accent)" : "var(--border)",
                    background: date === item ? "var(--agent-accent-soft)" : "white"
                  }}
                >
                  {new Date(`${item}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                  })}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Preferred time of day">
              {(["morning", "afternoon", "evening"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={time === item}
                  onClick={() => setTime(item)}
                  className="agent-focus tap-target rounded-2xl border text-sm font-semibold capitalize"
                  style={{
                    borderColor: time === item ? "var(--agent-accent)" : "var(--border)",
                    background: time === item ? "var(--agent-accent-soft)" : "white"
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            <textarea
              aria-label="Optional showing note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="agent-focus mt-4 min-h-24 w-full resize-none rounded-2xl border border-warm-border bg-white/80 p-4"
              placeholder="Optional note"
            />
            <Button className="mt-4 w-full" disabled={busy} onClick={submitShowing}>
              Request this time
            </Button>
            {error ? <p role="alert" className="mt-4 text-sm leading-6 text-warm-muted">{error}</p> : null}
          </div>
        ) : (
          <div className="text-center">
            {agent.headshot_url ? (
              <Image
                src={agent.headshot_url}
                alt={agent.name}
                width={64}
                height={64}
                className="mx-auto h-16 w-16 rounded-full object-cover"
              />
            ) : null}
            <p className="mt-5 text-sm text-warm-muted">{firstName(agent.name)} is typing...</p>
            <h2 id={titleId} className="mt-3 font-serif text-3xl">{firstName(agent.name)} will confirm shortly.</h2>
            <p className="mt-3 text-sm leading-6 text-warm-muted">Typically replies within 15 minutes during the day.</p>
            <Button className="mt-6 w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function nextDay(day: number) {
  const date = new Date();
  const diff = (day + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}
