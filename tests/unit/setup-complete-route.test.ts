import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/setup/complete/route";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  setAgentSession: vi.fn(),
  getSetupDraft: vi.fn(),
  saveSetupDraft: vi.fn(),
  onboardAgent: vi.fn(),
  resolveAgentBySlug: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserId: mocks.getCurrentUserId,
  setAgentSession: mocks.setAgentSession
}));

vi.mock("@/lib/setup/drafts", () => ({
  getSetupDraft: mocks.getSetupDraft,
  saveSetupDraft: mocks.saveSetupDraft
}));

vi.mock("@/lib/onboard-agent", () => ({
  onboardAgent: mocks.onboardAgent
}));

vi.mock("@/lib/resolve-agent", () => ({
  resolveAgentBySlug: mocks.resolveAgentBySlug
}));

function listing(address: string) {
  return {
    address,
    price: 750000,
    beds: 3,
    baths: 2,
    neighborhood: "San Ramon",
    features: ["yard"],
    dealBreakerFlags: [],
    agent_note: "Useful layout and easy showing."
  };
}

describe("/api/setup/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserId.mockResolvedValue("user_123");
    mocks.resolveAgentBySlug.mockResolvedValue(null);
    mocks.onboardAgent.mockResolvedValue({ id: "agent_1", slug: "maya" });
  });

  it("allows publishing with one selected neighborhood", async () => {
    mocks.getSetupDraft.mockResolvedValue({
      user_id: "user_123",
      current_step: "link",
      data: {
        slug: "maya",
        name: "Maya Chen",
        market: "San Francisco, CA",
        neighborhoods: ["San Ramon"],
        headshotUrl: "https://example.com/headshot.jpg",
        phone: "+15125550141",
        email: "maya@example.com",
        listings: [
          listing("1 Palm Lane"),
          listing("2 Palm Lane"),
          listing("3 Palm Lane")
        ]
      }
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.onboardAgent).toHaveBeenCalledWith(expect.objectContaining({
      neighborhoods: ["San Ramon"]
    }));
  });
});
