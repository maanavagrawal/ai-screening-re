import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/events/route";
import type { Agent, Lead } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  resolveAgentBySlug: vi.fn(),
  findLeadById: vi.fn(),
  recomputeLeadTemperature: vi.fn(),
  logEvents: vi.fn()
}));

vi.mock("@/lib/resolve-agent", () => ({
  resolveAgentBySlug: mocks.resolveAgentBySlug
}));

vi.mock("@/lib/leads", () => ({
  findLeadById: mocks.findLeadById,
  recomputeLeadTemperature: mocks.recomputeLeadTemperature
}));

vi.mock("@/lib/events", async () => {
  const actual = await vi.importActual<typeof import("@/lib/events")>("@/lib/events");
  return {
    ...actual,
    logEvents: mocks.logEvents
  };
});

const agent: Agent = {
  id: "agent-1",
  slug: "elena",
  name: "Elena Ruiz",
  headshot_url: null,
  bio: null,
  market: "Austin, TX",
  neighborhoods: ["East Austin"],
  phone: null,
  email: "elena@example.com",
  closed_volume_usd: 0,
  buyers_placed: 0,
  accent_color: "#C97B5C"
};

const lead: Lead = {
  id: "00000000-0000-4000-8000-000000000001",
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
  created_at: "2026-05-13T11:00:00.000Z"
};

function jsonRequest(body: unknown) {
  return new Request("https://app.example.com/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function assertResponse(response: Response | undefined): Response {
  expect(response).toBeDefined();
  if (!response) throw new Error("Expected response");
  return response;
}

describe("events route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAgentBySlug.mockResolvedValue(agent);
    mocks.findLeadById.mockResolvedValue(lead);
    mocks.logEvents.mockResolvedValue([{ id: "event-1" }]);
    mocks.recomputeLeadTemperature.mockResolvedValue(lead);
  });

  it("logs and recomputes when the lead belongs to the agent and session", async () => {
    const response = assertResponse(await POST(jsonRequest({
      agent_slug: "elena",
      session_id: "session-1",
      lead_id: lead.id,
      events: [{ event_type: "listing_viewed", metadata: { listing_id: "listing-1" } }]
    })));

    expect(response.status).toBe(200);
    expect(mocks.logEvents).toHaveBeenCalledWith({
      agent,
      sessionId: "session-1",
      leadId: lead.id,
      events: [{ event_type: "listing_viewed", metadata: { listing_id: "listing-1" } }]
    });
    expect(mocks.recomputeLeadTemperature).toHaveBeenCalledWith(lead.id);
  });

  it("does not attach events or recompute when the lead session does not match", async () => {
    const response = assertResponse(await POST(jsonRequest({
      agent_slug: "elena",
      session_id: "attacker-session",
      lead_id: lead.id,
      events: [{ event_type: "listing_viewed", metadata: {} }]
    })));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Lead not found" });
    expect(mocks.logEvents).not.toHaveBeenCalled();
    expect(mocks.recomputeLeadTemperature).not.toHaveBeenCalled();
  });
});
