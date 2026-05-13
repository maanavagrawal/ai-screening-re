"use client";

import { useState } from "react";
import { ContinueButton, QuestionFrame } from "@/components/intake/primitives";
import { formatCurrency } from "@/lib/formatting";

export function BudgetQuestion({
  disabled,
  onAnswer
}: {
  disabled?: boolean;
  onAnswer: (value: { min: number; max: number }) => void;
}) {
  const [min, setMin] = useState(500000);
  const [max, setMax] = useState(850000);

  return (
    <QuestionFrame title="What budget range feels right?">
      <div className="rounded-2xl border border-warm-border bg-white/70 p-5">
        <p className="font-serif text-3xl">
          {formatCurrency(min)}–{formatCurrency(max)}
        </p>
        <label className="mt-6 block text-sm font-semibold text-warm-muted">
          Minimum
          <input
            aria-label="Minimum budget"
            type="range"
            min={200000}
            max={2000000}
            step={25000}
            value={min}
            disabled={disabled}
            onChange={(event) => setMin(Math.min(Number(event.target.value), max - 25000))}
            className="mt-2 w-full accent-[var(--agent-accent)]"
          />
        </label>
        <label className="mt-5 block text-sm font-semibold text-warm-muted">
          Maximum
          <input
            aria-label="Maximum budget"
            type="range"
            min={200000}
            max={2000000}
            step={25000}
            value={max}
            disabled={disabled}
            onChange={(event) => setMax(Math.max(Number(event.target.value), min + 25000))}
            className="mt-2 w-full accent-[var(--agent-accent)]"
          />
        </label>
      </div>
      <ContinueButton disabled={disabled} onClick={() => onAnswer({ min, max })} />
    </QuestionFrame>
  );
}
