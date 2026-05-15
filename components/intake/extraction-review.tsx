"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, QuestionFrame } from "@/components/intake/primitives";
import type { FreeTextExtractionResult } from "@/lib/ai/schemas";
import { formatCurrency } from "@/lib/formatting";

type ChipValue = {
  key: string;
  label: string;
};

function chipsFromExtraction(extraction: FreeTextExtractionResult): ChipValue[] {
  return [
    extraction.beds ? { key: "beds", label: `${extraction.beds} bedrooms` } : null,
    extraction.baths ? { key: "baths", label: `${extraction.baths} baths` } : null,
    extraction.budget_max ? { key: "budget_max", label: `Up to ${formatCurrency(extraction.budget_max)}` } : null,
    ...extraction.neighborhoods.map((item) => ({ key: `neighborhood:${item}`, label: item })),
    ...extraction.must_haves.map((item) => ({ key: `must:${item}`, label: item.replaceAll("_", " ") })),
    ...extraction.deal_breakers.map((item) => ({ key: `breaker:${item}`, label: `avoid ${item.replaceAll("_", " ")}` }))
  ].filter(Boolean) as ChipValue[];
}

export function ExtractionReview({
  extraction,
  onAccept,
  onEdited,
  disabled = false
}: {
  extraction: FreeTextExtractionResult;
  onAccept: (extraction: FreeTextExtractionResult) => void;
  onEdited: () => void;
  disabled?: boolean;
}) {
  const chips = useMemo(() => chipsFromExtraction(extraction), [extraction]);
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState(() => new Set(chips.map((chip) => chip.key)));

  function acceptedExtraction() {
    return {
      ...extraction,
      beds: active.has("beds") ? extraction.beds : null,
      baths: active.has("baths") ? extraction.baths : null,
      budget_max: active.has("budget_max") ? extraction.budget_max : null,
      neighborhoods: extraction.neighborhoods.filter((item) => active.has(`neighborhood:${item}`)),
      must_haves: extraction.must_haves.filter((item) => active.has(`must:${item}`)),
      deal_breakers: extraction.deal_breakers.filter((item) => active.has(`breaker:${item}`))
    };
  }

  return (
    <QuestionFrame title="I heard this. Sound right?">
      <div className="flex flex-wrap gap-2">
        {chips.length ? (
          chips.map((chip) => (
            <Chip
              key={chip.key}
              selected={active.has(chip.key)}
              onClick={
                editing
                  ? () => {
                      const next = new Set(active);
                      if (next.has(chip.key)) next.delete(chip.key);
                      else next.add(chip.key);
                      setActive(next);
                    }
                  : undefined
              }
            >
              {chip.label}
            </Chip>
          ))
        ) : (
          <p className="rounded-2xl border border-warm-border bg-white/70 p-4 text-sm text-warm-muted">
            A little light on specifics, but that is okay. I will ask a few fast follow-ups.
          </p>
        )}
      </div>
      <div className="mt-6 grid gap-3">
        <Button disabled={disabled} onClick={() => onAccept(acceptedExtraction())}>
          {disabled ? "Continuing..." : editing ? "Save and continue" : "Yes, continue"}
        </Button>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => {
            setEditing(true);
            onEdited();
          }}
        >
          Let me fix it
        </Button>
      </div>
    </QuestionFrame>
  );
}
