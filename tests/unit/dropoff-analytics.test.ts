import { describe, expect, it } from "vitest";
import { buildDropoffAnalytics } from "@/lib/dashboard/dropoff";
import type { EventRecord } from "@/lib/types";

function event(session: string, type: string, createdAt: string): EventRecord {
  return {
    id: `${session}-${type}-${createdAt}`,
    session_id: session,
    lead_id: null,
    agent_id: "agent-1",
    event_type: type,
    metadata: {},
    created_at: createdAt
  };
}

describe("dropoff analytics", () => {
  it("counts anonymous abandoned sessions without creating anonymous leads", () => {
    const analytics = buildDropoffAnalytics(
      [
        event("a", "intake_started", "2026-05-14T10:00:00.000Z"),
        event("a", "intake_free_text_submitted", "2026-05-14T10:02:00.000Z"),
        event("b", "intake_started", "2026-05-14T10:05:00.000Z"),
        event("b", "lead_created", "2026-05-14T10:15:00.000Z")
      ],
      new Date("2026-05-14T11:00:00.000Z")
    );

    expect(analytics.sessionsStarted).toBe(2);
    expect(analytics.anonymousAbandoned).toBe(1);
    expect(analytics.steps.find((step) => step.event_type === "intake_started")?.dropoffAfter).toBe(1);
  });
});
