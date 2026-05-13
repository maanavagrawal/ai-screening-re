import type { Agent, Lead } from "@/lib/types";

export function NewLeadEmail({ agent, lead }: { agent: Agent; lead: Lead }) {
  const brief = lead.brief as { one_line_summary?: string; suggested_opener?: string } | null;
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", color: "#1A1A1A" }}>
      <h1>New buyer lead for {agent.name}</h1>
      <p>{brief?.one_line_summary ?? `${lead.email} completed your buyer intake.`}</p>
      {brief?.suggested_opener ? (
        <blockquote style={{ borderLeft: "3px solid #C97B5C", paddingLeft: 16 }}>
          {brief.suggested_opener}
        </blockquote>
      ) : null}
    </div>
  );
}

