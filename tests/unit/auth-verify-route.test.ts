import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/auth/verify/route";

const mocks = vi.hoisted(() => ({
  consumeAgentMagicLink: vi.fn(),
  getAgentMagicLink: vi.fn(),
  isAgentMagicLinkUsable: vi.fn(),
  setAgentSession: vi.fn(),
  hasPostgresEnv: vi.fn(),
  getPublicOriginFromRequest: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  consumeAgentMagicLink: mocks.consumeAgentMagicLink,
  getAgentMagicLink: mocks.getAgentMagicLink,
  isAgentMagicLinkUsable: mocks.isAgentMagicLinkUsable,
  setAgentSession: mocks.setAgentSession
}));

vi.mock("@/lib/db/postgres", () => ({
  hasPostgresEnv: mocks.hasPostgresEnv
}));

vi.mock("@/lib/public-origin", () => ({
  getPublicOriginFromRequest: mocks.getPublicOriginFromRequest
}));

describe("/auth/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasPostgresEnv.mockReturnValue(true);
    mocks.getPublicOriginFromRequest.mockReturnValue("https://app.example.com");
    mocks.isAgentMagicLinkUsable.mockReturnValue(true);
  });

  it("does not consume a valid magic link on GET", async () => {
    mocks.getAgentMagicLink.mockResolvedValue({
      id: "link_1",
      user_id: "user_1",
      email: "agent@example.com",
      used_at: null,
      expires_at: new Date(Date.now() + 60_000).toISOString()
    });

    const response = await GET(new Request("https://0.0.0.0:8080/auth/verify?token=token_123"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toContain('method="post"');
    expect(body).toContain('name="token" value="token_123"');
    expect(body).not.toContain("<script");
    expect(mocks.consumeAgentMagicLink).not.toHaveBeenCalled();
  });

  it("consumes a magic link on POST and redirects to the public setup URL", async () => {
    mocks.consumeAgentMagicLink.mockResolvedValue({
      id: "link_1",
      user_id: "user_1",
      email: "agent@example.com"
    });

    const response = await POST(
      new Request("https://0.0.0.0:8080/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "token=token_123"
      })
    );

    expect(mocks.consumeAgentMagicLink).toHaveBeenCalledWith("token_123");
    expect(mocks.setAgentSession).toHaveBeenCalledWith({
      userId: "user_1",
      email: "agent@example.com"
    });
    expect(response.headers.get("location")).toBe("https://app.example.com/setup/welcome");
  });

  it("redirects expired GET tokens to the public signup URL", async () => {
    mocks.getAgentMagicLink.mockResolvedValue(null);
    mocks.isAgentMagicLinkUsable.mockReturnValue(false);

    const response = await GET(new Request("https://0.0.0.0:8080/auth/verify?token=expired"));

    expect(response.headers.get("location")).toBe("https://app.example.com/signup?expired=1");
    expect(mocks.consumeAgentMagicLink).not.toHaveBeenCalled();
  });

  it("fails closed if a public origin cannot be resolved", async () => {
    mocks.getPublicOriginFromRequest.mockReturnValue(null);
    mocks.getAgentMagicLink.mockResolvedValue({
      id: "link_1",
      user_id: "user_1",
      email: "agent@example.com",
      used_at: null,
      expires_at: new Date(Date.now() + 60_000).toISOString()
    });

    const response = await GET(new Request("https://0.0.0.0:8080/auth/verify?token=token_123"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "NEXT_PUBLIC_APP_URL is required for reachable setup links"
    });
  });
});
