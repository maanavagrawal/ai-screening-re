import type { Agent, Lead, Listing } from "@/lib/types";

export function ShowingRequestEmail({
  agent,
  lead,
  listing
}: {
  agent: Agent;
  lead: Lead;
  listing?: Listing | null;
}) {
  const brief = lead.brief as { one_line_summary?: string; suggested_opener?: string } | null;
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", color: "#1A1A1A" }}>
      <h1>Showing request</h1>
      <p>
        {lead.first_name ?? "A buyer"} wants to see {listing?.address ?? "a listing"} with {agent.name}.
      </p>
      <p>{brief?.one_line_summary}</p>
      {brief?.suggested_opener ? <p>Suggested opener: {brief.suggested_opener}</p> : null}
    </div>
  );
}

