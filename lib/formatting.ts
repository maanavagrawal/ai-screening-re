export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function formatCurrency(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  }

  return `$${Math.round(value / 1_000)}k`;
}

export function formatClosedVolume(value: number) {
  if (value <= 0) return "";
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}M`;
  return formatCurrency(value);
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
