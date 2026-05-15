import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardReturnPath, resolveAgentAccessDestination, sanitizeReturnTo } from "@/lib/auth/destinations";

const mocks = vi.hoisted(() => ({
  getAgentByUserId: vi.fn(),
  getSetupDraft: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  getAgentByUserId: mocks.getAgentByUserId
}));

vi.mock("@/lib/setup/drafts", () => ({
  getSetupDraft: mocks.getSetupDraft
}));

describe("sanitizeReturnTo", () => {
  it("accepts known dashboard paths", () => {
    expect(sanitizeReturnTo("/dashboard")).toBe("/dashboard");
    expect(sanitizeReturnTo("/dashboard/listings?ignored=1")).toBe("/dashboard/listings");
    expect(dashboardReturnPath("distribution")).toBe("/dashboard/distribution");
  });

  it("rejects external, protocol-relative, setup, and unknown paths", () => {
    expect(sanitizeReturnTo("https://evil.example/dashboard")).toBeNull();
    expect(sanitizeReturnTo("//evil.example/dashboard")).toBeNull();
    expect(sanitizeReturnTo("/setup/welcome")).toBeNull();
    expect(sanitizeReturnTo("/maya")).toBeNull();
    expect(dashboardReturnPath("not-real")).toBe("/dashboard/leads");
  });
});

describe("resolveAgentAccessDestination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAgentByUserId.mockResolvedValue(null);
    mocks.getSetupDraft.mockResolvedValue(null);
  });

  it("sends completed agents to a safe return target when present", async () => {
    mocks.getAgentByUserId.mockResolvedValue({ slug: "maya" });

    await expect(resolveAgentAccessDestination({ userId: "user_1", returnTo: "/dashboard/listings" }))
      .resolves.toBe("/dashboard/listings");
  });

  it("falls back completed agents to leads when return target is unsafe", async () => {
    mocks.getAgentByUserId.mockResolvedValue({ slug: "maya" });

    await expect(resolveAgentAccessDestination({ userId: "user_1", returnTo: "https://evil.example" }))
      .resolves.toBe("/dashboard/leads");
  });

  it("resumes incomplete setup at the saved draft step", async () => {
    mocks.getSetupDraft.mockResolvedValue({ current_step: "link" });

    await expect(resolveAgentAccessDestination({ userId: "user_1" })).resolves.toBe("/setup/link");
  });

  it("starts new agents at welcome when there is no draft", async () => {
    await expect(resolveAgentAccessDestination({ userId: "user_1" })).resolves.toBe("/setup/welcome");
  });
});
