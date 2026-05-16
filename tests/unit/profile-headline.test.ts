import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/dashboard/settings/headline/route";
import type { Agent } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  getCurrentAgent: vi.fn(),
  generateProfileHeadline: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentAgent: mocks.getCurrentAgent
}));

vi.mock("@/lib/ai/anthropic", () => ({
  generateProfileHeadline: mocks.generateProfileHeadline
}));

const agent: Agent = {
  id: "agent-1",
  user_id: "user-1",
  slug: "maya",
  name: "Maya Chen",
  headshot_url: null,
  bio: "Austin buyer specialist who is direct about renovation tradeoffs.",
  headline: "Find your Austin home with Maya.",
  market: "Austin, TX",
  neighborhoods: ["East Austin"],
  phone: null,
  email: null,
  closed_volume_usd: 0,
  buyers_placed: 0,
  accent_color: "#C97B5C"
};

describe("profile headline generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentAgent.mockResolvedValue(agent);
    mocks.generateProfileHeadline.mockResolvedValue({
      headline: "Austin homes, clear tradeoffs, and no pressure."
    });
  });

  it("generates from the editable bio and market supplied by settings", async () => {
    const response = await POST(
      new Request("https://app.example.com/api/dashboard/settings/headline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bio: "Denver buyer advisor with a practical eye for resale.",
          market: "Denver, CO"
        })
      })
    );

    expect(response!.status).toBe(200);
    expect(await response!.json()).toEqual({
      headline: "Austin homes, clear tradeoffs, and no pressure."
    });
    expect(mocks.generateProfileHeadline).toHaveBeenCalledWith({
      name: "Maya Chen",
      market: "Denver, CO",
      bio: "Denver buyer advisor with a practical eye for resale."
    });
  });

  it("requires either a submitted bio or existing profile bio", async () => {
    mocks.getCurrentAgent.mockResolvedValue({ ...agent, bio: null });

    const response = await POST(
      new Request("https://app.example.com/api/dashboard/settings/headline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      })
    );

    expect(response!.status).toBe(400);
    expect(mocks.generateProfileHeadline).not.toHaveBeenCalled();
  });

  it("keeps dashboard settings editable while adding an AI generate action", () => {
    const source = readFileSync("components/dashboard/dashboard-shell.tsx", "utf8");

    expect(source).toContain('label="Headline"');
    expect(source).toContain("/api/dashboard/settings/headline");
    expect(source).toContain("Generate");
  });
});
