"use client";

import { useEffect, useMemo, useState } from "react";
import { ChoiceGrid, ContinueButton, QuestionFrame } from "@/components/intake/primitives";
import type { SelectedArea } from "@/lib/types";

type LocationSuggestion = SelectedArea & { attribution?: "google" | "agent" | "manual" };

function displaySegment(value: string) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return value.replace("_plus", "+");
}

export function CurrentSituationQuestion({
  disabled,
  onAnswer
}: {
  disabled?: boolean;
  onAnswer: (value: unknown) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <QuestionFrame title="What is your current situation?">
      <ChoiceGrid
        value={value}
        disabled={disabled}
        onSelect={(next) => setValue(next as string)}
        options={[
          { label: "Renting", value: "renting" },
          { label: "Own, plan to sell", value: "own_plan_to_sell" },
          { label: "Own, keeping it", value: "own_keeping" },
          { label: "Living with family/other", value: "family_or_other" }
        ]}
      />
      <ContinueButton disabled={disabled || !value} onClick={() => onAnswer({ status: value })} />
    </QuestionFrame>
  );
}

export function FinancingQuestion({
  disabled,
  onAnswer
}: {
  disabled?: boolean;
  onAnswer: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <QuestionFrame title="How are you thinking about financing?">
      <ChoiceGrid
        value={value}
        disabled={disabled}
        onSelect={(next) => setValue(next as string)}
        options={[
          { label: "Pre-approved", value: "pre_approved" },
          { label: "In process", value: "in_process" },
          { label: "Cash buyer", value: "cash_buyer" },
          { label: "Haven't started", value: "not_started" }
        ]}
      />
      <ContinueButton disabled={disabled || !value} onClick={() => onAnswer(value)} />
    </QuestionFrame>
  );
}

export function FinancingHelpQuestion({
  disabled,
  onAnswer
}: {
  disabled?: boolean;
  onAnswer: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <QuestionFrame title="Want help getting pre-approved?">
      <ChoiceGrid
        value={value}
        disabled={disabled}
        onSelect={(next) => setValue(next as string)}
        options={[
          { label: "Yes, connect me with a lender", value: "yes_connect_lender" },
          { label: "No, I'll figure it out", value: "no" }
        ]}
      />
      <ContinueButton disabled={disabled || !value} onClick={() => onAnswer(value)} />
    </QuestionFrame>
  );
}

export function SegmentedQuestion({
  title,
  options,
  disabled,
  onAnswer
}: {
  title: string;
  options: string[];
  disabled?: boolean;
  onAnswer: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <QuestionFrame title={title}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            disabled={disabled}
            onClick={() => setValue(option)}
            className="agent-focus tap-target rounded-2xl border text-sm font-semibold"
            style={{
              borderColor: value === option ? "var(--agent-accent)" : "var(--border)",
              background: value === option ? "var(--agent-accent-soft)" : "rgba(255,255,255,0.7)"
            }}
          >
            {displaySegment(option)}
          </button>
        ))}
      </div>
      <ContinueButton disabled={disabled || !value} onClick={() => onAnswer(value)} />
    </QuestionFrame>
  );
}

export function MultiSelectQuestion({
  title,
  options,
  initial,
  disabled,
  onAnswer
}: {
  title: string;
  options: Array<{ label: string; value: string }>;
  initial?: string[];
  disabled?: boolean;
  onAnswer: (value: string[]) => void;
}) {
  const [values, setValues] = useState<string[]>(initial ?? []);
  return (
    <QuestionFrame title={title}>
      <ChoiceGrid disabled={disabled} multi value={values} onSelect={(next) => setValues(next as string[])} options={options} />
      <ContinueButton disabled={disabled} onClick={() => onAnswer(values)}>{values.length ? "Continue" : "Skip"}</ContinueButton>
    </QuestionFrame>
  );
}

export function LocationQuestion({
  agentSlug,
  initialOptions,
  initial,
  disabled,
  onAnswer
}: {
  agentSlug: string;
  initialOptions: string[];
  initial?: SelectedArea[];
  disabled?: boolean;
  onAnswer: (value: { selected_areas: SelectedArea[]; neighborhoods: string[]; open_to_suggestions: boolean }) => void;
}) {
  const initialSuggestions = useMemo<LocationSuggestion[]>(
    () =>
      initialOptions.map((label) => ({
        label,
        source: "agent_suggestion" as const,
        type: "neighborhood" as const,
        attribution: "agent" as const
      })),
    [initialOptions]
  );
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [selected, setSelected] = useState<SelectedArea[]>(initial ?? []);
  const [openToSuggestions, setOpenToSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions(initialSuggestions);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      const response = await fetch("/api/intake/location-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_slug: agentSlug, query: trimmed })
      });
      const body = (await response.json().catch(() => null)) as { suggestions?: LocationSuggestion[] } | null;
      setLoading(false);
      if (response.ok && body?.suggestions) setSuggestions(body.suggestions);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [agentSlug, initialSuggestions, query]);

  function toggle(area: SelectedArea) {
    setSelected((current) => {
      const exists = current.some((item) => item.label === area.label && item.type === area.type);
      return exists ? current.filter((item) => !(item.label === area.label && item.type === area.type)) : [...current, area];
    });
  }

  return (
    <QuestionFrame title="Where should we look?">
      <input
        className="h-12 w-full rounded-2xl border-warm-border bg-white px-4 text-sm"
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="City, neighborhood, ZIP, or school district"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {selected.map((area) => (
          <button
            key={`${area.type}:${area.label}`}
            type="button"
            disabled={disabled}
            className="rounded-full bg-[var(--agent-accent)] px-3 py-2 text-xs font-semibold text-white"
            onClick={() => toggle(area)}
          >
            {area.label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-2">
        {suggestions.slice(0, 6).map((area) => {
          const active = selected.some((item) => item.label === area.label && item.type === area.type);
          return (
            <button
              key={`${area.type}:${area.label}:${area.placeId ?? ""}`}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              className="agent-focus flex min-h-14 items-center justify-between rounded-2xl border bg-white px-4 py-3 text-left text-sm"
              style={{
                borderColor: active ? "var(--agent-accent)" : "var(--border)",
                background: active ? "var(--agent-accent-soft)" : "rgba(255,255,255,0.7)"
              }}
              onClick={() => toggle(area)}
            >
              <span>
                <span className="block font-semibold">{area.label}</span>
                {area.parentLabel ? <span className="text-xs text-warm-muted">{area.parentLabel}</span> : null}
              </span>
              <span className="text-xs capitalize text-warm-muted">{area.type.replaceAll("_", " ")}</span>
            </button>
          );
        })}
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          disabled={disabled}
          checked={openToSuggestions}
          onChange={(event) => setOpenToSuggestions(event.target.checked)}
        />
        Open to agent suggestions
      </label>
      {suggestions.some((item) => item.source === "google_places") ? (
        <p className="mt-3 text-xs text-warm-muted">Powered by Google</p>
      ) : null}
      <ContinueButton
        disabled={disabled || loading}
        onClick={() =>
          onAnswer({
            selected_areas: selected,
            neighborhoods: selected.map((area) => area.label),
            open_to_suggestions: openToSuggestions
          })
        }
      >
        {selected.length || openToSuggestions ? "Continue" : "Skip"}
      </ContinueButton>
    </QuestionFrame>
  );
}
