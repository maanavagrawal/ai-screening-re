"use client";

import { useState } from "react";
import { ChoiceGrid, ContinueButton, QuestionFrame } from "@/components/intake/primitives";

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
