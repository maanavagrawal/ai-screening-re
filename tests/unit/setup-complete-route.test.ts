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

  function completeDraft(listings = [listing("1 Palm Lane")]) {
    return {
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
        listings
      }
    };
  }

  it("allows publishing with one selected neighborhood and one complete listing", async () => {
    mocks.getSetupDraft.mockResolvedValue({
      ...completeDraft()
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.onboardAgent).toHaveBeenCalledWith(expect.objectContaining({
      neighborhoods: ["San Ramon"],
      listings: [expect.objectContaining({ address: "1 Palm Lane" })]
    }));
  });

  it("filters incomplete draft listing cards before onboarding", async () => {
    mocks.getSetupDraft.mockResolvedValue(completeDraft([
      listing("1 Palm Lane"),
      { address: "Unfinished Lane", neighborhood: "San Ramon" } as ReturnType<typeof listing>
    ]));

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.onboardAgent).toHaveBeenCalledWith(expect.objectContaining({
      listings: [expect.objectContaining({ address: "1 Palm Lane" })]
    }));
  });

  it("rejects publishing without a complete listing", async () => {
    mocks.getSetupDraft.mockResolvedValue(completeDraft([
      { address: "Unfinished Lane", price: 750000, neighborhood: "San Ramon" } as ReturnType<typeof listing>
    ]));

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Add at least 1 complete listing before publishing");
    expect(mocks.onboardAgent).not.toHaveBeenCalled();
  });

  it("rejects publishing with no listings", async () => {
    mocks.getSetupDraft.mockResolvedValue(completeDraft([]));

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Add at least 1 complete listing before publishing");
    expect(mocks.onboardAgent).not.toHaveBeenCalled();
  });
});
