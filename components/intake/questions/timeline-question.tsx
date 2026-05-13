"use client";

import { useState } from "react";
import { ChoiceGrid, ContinueButton, QuestionFrame } from "@/components/intake/primitives";

export function TimelineQuestion({
  disabled,
  onAnswer
}: {
  disabled?: boolean;
  onAnswer: (value: { preset: string; target_date?: string | null }) => void;
}) {
  const [preset, setPreset] = useState<string>("");
  return (
    <QuestionFrame title="When do you want to be in a new home?">
      <ChoiceGrid
        value={preset}
        disabled={disabled}
        onSelect={(value) => setPreset(value as string)}
        options={[
          { label: "30 days", value: "30_days" },
          { label: "60 days", value: "60_days" },
          { label: "90 days", value: "90_days" },
          { label: "6 months", value: "6_months" },
          { label: "Just exploring", value: "just_exploring" }
        ]}
      />
      <ContinueButton disabled={disabled || !preset} onClick={() => onAnswer({ preset, target_date: null })} />
    </QuestionFrame>
  );
}
