import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/magic-link/route";

const mocks = vi.hoisted(() => ({
  createAgentMagicLink: vi.fn(),
  devUserIdFromEmail: vi.fn(),
  setAgentSession: vi.fn(),
  getMagicLinkMode: vi.fn(),
  hasPostgresEnv: vi.fn(),
  getPublicOriginFromRequest: vi.fn(),
  ensureSetupDraftInitialized: vi.fn(),
  resolveAgentAccessDestination: vi.fn()
}));

vi.mock("@/lib/auth/magic-link-mode", () => ({
  getMagicLinkMode: mocks.getMagicLinkMode
}));

vi.mock("@/lib/auth/session", () => ({
  createAgentMagicLink: mocks.createAgentMagicLink,
  devUserIdFromEmail: mocks.devUserIdFromEmail,
  setAgentSession: mocks.setAgentSession
}));

vi.mock("@/lib/db/postgres", () => ({
  hasPostgresEnv: mocks.hasPostgresEnv
}));

vi.mock("@/lib/public-origin", () => ({
  getPublicOriginFromRequest: mocks.getPublicOriginFromRequest
}));

vi.mock("@/lib/setup/drafts", () => ({
  ensureSetupDraftInitialized: mocks.ensureSetupDraftInitialized
}));

vi.mock("@/lib/auth/destinations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/destinations")>();
  return {
    ...actual,
    resolveAgentAccessDestination: mocks.resolveAgentAccessDestination
  };
});

describe("/api/auth/magic-link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasPostgresEnv.mockReturnValue(true);
    mocks.getPublicOriginFromRequest.mockReturnValue("https://app.example.com");
    mocks.createAgentMagicLink.mockResolvedValue({ userId: "user_1", token: "token_123" });
    mocks.devUserIdFromEmail.mockReturnValue("user_1");
    mocks.resolveAgentAccessDestination.mockResolvedValue("/dashboard/listings");
  });

  it("stores sanitized return targets on Postgres magic links", async () => {
    mocks.getMagicLinkMode.mockReturnValue("postgres_dev_link");

    const response = await POST(
      new Request("https://app.example.com/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "agent@example.com",
          return_to: "/dashboard/listings?ignored=1"
        })
      })
    );

    expect(response).toBeDefined();
    expect(response!.status).toBe(200);
    expect(mocks.createAgentMagicLink).toHaveBeenCalledWith({
      email: "agent@example.com",
      returnTo: "/dashboard/listings"
    });
    expect(mocks.ensureSetupDraftInitialized).toHaveBeenCalledWith({
      userId: "user_1",
      email: "agent@example.com"
    });
  });

  it("does not pass unsafe return targets through dev session auth", async () => {
    mocks.getMagicLinkMode.mockReturnValue("dev_session");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "agent@example.com",
          return_to: "https://evil.example/dashboard"
        })
      })
    );

    expect(response).toBeDefined();
    expect(response!.status).toBe(200);
    expect(mocks.resolveAgentAccessDestination).toHaveBeenCalledWith({
      userId: "user_1",
      returnTo: null
    });
    expect(await response!.json()).toMatchObject({ redirectTo: "/dashboard/listings" });
  });
});
