import type { Agent, Lead } from "@/lib/types";

export function HotLeadEmail({ agent, lead }: { agent: Agent; lead: Lead }) {
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", color: "#1A1A1A" }}>
      <h1>Hot lead for {agent.name}</h1>
      <p>{lead.first_name ?? lead.email} is showing strong intent.</p>
      <ul>
        {(lead.temperature_reasons ?? []).map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}

