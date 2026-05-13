import { notFound } from "next/navigation";
import { DEFAULT_ACCENT } from "@/lib/constants";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default async function AgentLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ agentSlug: string }>;
}) {
  const { agentSlug } = await params;
  const agent = await resolveAgentBySlug(agentSlug);
  if (!agent) notFound();

  const accent = agent.accent_color ?? DEFAULT_ACCENT;
  return (
    <div
      style={
        {
          "--agent-accent": accent,
          "--agent-accent-soft": hexToRgba(accent, 0.14)
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
