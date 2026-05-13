"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/formatting";

export function QuestionFrame({
  eyebrow,
  title,
  subtitle,
  children
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.2 }}
      className="flex min-h-[calc(100svh-4rem)] flex-col justify-center py-10"
    >
      {eyebrow ? <p className="mb-4 text-sm font-semibold text-[var(--agent-accent)]">{eyebrow}</p> : null}
      <h1 className="break-words font-serif text-3xl leading-[1.04] text-warm-text sm:text-4xl">{title}</h1>
      {subtitle ? <p className="mt-4 text-base leading-7 text-warm-muted">{subtitle}</p> : null}
      <div className="mt-8">{children}</div>
    </motion.section>
  );
}

export function ChoiceGrid({
  options,
  value,
  onSelect,
  multi = false,
  disabled = false
}: {
  options: Array<{ label: string; value: string; description?: string }>;
  value?: string | string[];
  onSelect: (value: string | string[]) => void;
  multi?: boolean;
  disabled?: boolean;
}) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return (
    <div className="grid gap-3">
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => {
              if (!multi) {
                onSelect(option.value);
                return;
              }
              onSelect(
                selected ? values.filter((item) => item !== option.value) : [...values, option.value]
              );
            }}
            className={cn(
              "agent-focus tap-target flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition",
              selected
                ? "border-[var(--agent-accent)] bg-[var(--agent-accent-soft)]"
                : "border-warm-border bg-white/60 hover:bg-white"
            )}
          >
            <span>
              <span className="block text-sm font-semibold">{option.label}</span>
              {option.description ? (
                <span className="mt-1 block text-sm text-warm-muted">{option.description}</span>
              ) : null}
            </span>
            {selected ? <Check size={18} className="text-[var(--agent-accent)]" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function ContinueButton({
  children = "Continue",
  disabled,
  onClick
}: {
  children?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button className="mt-5 w-full" disabled={disabled} onClick={onClick} type="button">
      {children}
    </Button>
  );
}

export function Chip({
  selected,
  children,
  onClick
}: {
  selected?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={onClick ? Boolean(selected) : undefined}
      onClick={onClick}
      className={cn(
        "agent-focus rounded-full border px-4 py-2 text-sm font-semibold transition",
        selected ? "border-[var(--agent-accent)] bg-[var(--agent-accent-soft)]" : "border-warm-border bg-white/70"
      )}
    >
      {children}
    </button>
  );
}
