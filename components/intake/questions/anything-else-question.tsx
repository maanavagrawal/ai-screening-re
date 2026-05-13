"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuestionFrame } from "@/components/intake/primitives";

export function AnythingElseQuestion({
  disabled,
  onAnswer
}: {
  disabled?: boolean;
  onAnswer: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <QuestionFrame title="Anything else worth knowing?">
      <input
        aria-label="Anything else worth knowing"
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        className="agent-focus tap-target w-full rounded-2xl border border-warm-border bg-white/75 px-4 text-base"
        placeholder="Optional"
      />
      <div className="mt-5 grid gap-3">
        <Button disabled={disabled} onClick={() => onAnswer(value)}>Continue</Button>
        <Button disabled={disabled} variant="ghost" onClick={() => onAnswer("")}>
          Skip
        </Button>
      </div>
    </QuestionFrame>
  );
}
