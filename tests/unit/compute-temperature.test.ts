import { describe, expect, it } from "vitest";
import { computeTemperature } from "@/lib/compute-temperature";
import type { EventRecord, Lead } from "@/lib/types";

const now = new Date("2026-05-13T12:00:00.000Z");

function lead(patch: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    agent_id: "agent-1",
    session_id: "session-1",
    first_name: "Sarah",
    phone: "+15125550141",
    phone_verified: false,
    email: "sarah@example.com",
    preferences: {},
    preapproval_url: null,
    free_text_raw: null,
    tier: "captured",
    brief: null,
    created_at: "2026-05-13T11:00:00.000Z",
    ...patch
  };
}

function event(event_type: string, metadata: Record<string, unknown> = {}): EventRecord {
  return {
    id: `${event_type}-${Math.random()}`,
    session_id: "session-1",
    lead_id: "lead-1",
    agent_id: "agent-1",
    event_type,
    metadata,
    created_at: "2026-05-13T11:30:00.000Z"
  };
}

describe("computeTemperature", () => {
  it("marks requested showing leads hot with clear reasons", () => {
    const result = computeTemperature(
      lead({ tier: "requested_showing", phone_verified: true }),
      [event("showing_verification_completed")],
      now
    );

    expect(result.temperature).toBe("hot");
    expect(result.score).toBe(7);
    expect(result.reasons).toContain("Requested a showing");
  });

  it("marks engaged return visitors warm", () => {
    const result = computeTemperature(
      lead(),
      [
        event("listing_viewed", { duration_ms: 45_000 }),
        event("listing_viewed", { duration_ms: 61_000 }),
        event("listing_video_replayed"),
        event("listing_video_replayed"),
        event("returned_to_matches")
      ],
      now
    );

    expect(result.temperature).toBe("warm");
    expect(result.score).toBe(5);
    expect(result.reasons[0]).toBe("2 long listing views");
  });

  it("keeps stale browsing leads in browsing", () => {
    const result = computeTemperature(
      lead({ tier: "browsing", created_at: "2026-04-20T11:00:00.000Z" }),
      [],
      now
    );

    expect(result.temperature).toBe("browsing");
    expect(result.score).toBe(-3);
    expect(result.reasons).toEqual(["Marked as browsing", "No activity in the last 7 days"]);
  });
});
