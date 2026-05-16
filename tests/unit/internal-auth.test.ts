import { afterEach, describe, expect, it, vi } from "vitest";
import { isInternalRequestAuthorized, requireInternalRequest } from "@/lib/internal-auth";

function request(headers: HeadersInit = {}) {
  return new Request("https://app.example.com/api/internal/task", { method: "POST", headers });
}

describe("internal API authorization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows local development without configuring a secret", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("INTERNAL_API_SECRET", "");

    expect(isInternalRequestAuthorized(request())).toBe(true);
  });

  it("fails closed in production when no internal secret is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INTERNAL_API_SECRET", "");

    const response = requireInternalRequest(request());

    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toEqual({ error: "Internal API secret is not configured" });
  });

  it("accepts matching bearer or x-internal-secret tokens only", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INTERNAL_API_SECRET", "secret-123");

    expect(isInternalRequestAuthorized(request({ authorization: "Bearer secret-123" }))).toBe(true);
    expect(isInternalRequestAuthorized(request({ "x-internal-secret": "secret-123" }))).toBe(true);
    expect(isInternalRequestAuthorized(request({ authorization: "Bearer wrong" }))).toBe(false);
    expect(isInternalRequestAuthorized(request())).toBe(false);
  });
});
