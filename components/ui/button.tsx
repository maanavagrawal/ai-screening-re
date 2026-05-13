import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/formatting";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const styles = {
  primary:
    "bg-[var(--agent-accent)] text-white shadow-soft hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45",
  secondary:
    "border border-warm-border bg-white/60 text-warm-text hover:bg-white disabled:cursor-not-allowed disabled:opacity-45",
  ghost: "text-warm-text hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-45"
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "agent-focus tap-target inline-flex items-center justify-center rounded-2xl px-5 py-3 text-center text-sm font-semibold transition",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
};

export function LinkButton({ className, variant = "primary", href, ...props }: LinkButtonProps) {
  return (
    <Link
      className={cn(
        "agent-focus tap-target inline-flex items-center justify-center rounded-2xl px-5 py-3 text-center text-sm font-semibold transition",
        styles[variant],
        className
      )}
      href={href}
      {...props}
    />
  );
}
