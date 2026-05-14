import { afterEach, describe, expect, it } from "vitest";
import { getPublicOriginFromRequest } from "@/lib/public-origin";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
});

describe("getPublicOriginFromRequest", () => {
  it("prefers NEXT_PUBLIC_APP_URL over Railway's internal request URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://web-production-09553.up.railway.app";
    const request = new Request("https://0.0.0.0:8080/api/auth/magic-link");

    expect(getPublicOriginFromRequest(request)).toBe("https://web-production-09553.up.railway.app");
  });

  it("uses forwarded host/proto before the internal request URL", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const request = new Request("https://0.0.0.0:8080/api/auth/magic-link", {
      headers: {
        "x-forwarded-host": "example.com",
        "x-forwarded-proto": "https"
      }
    });

    expect(getPublicOriginFromRequest(request)).toBe("https://example.com");
  });

  it("does not return an unreachable 0.0.0.0 origin", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const request = new Request("https://0.0.0.0:8080/api/auth/magic-link");

    expect(getPublicOriginFromRequest(request)).toBeNull();
  });

  it("keeps local development origins usable", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const request = new Request("http://127.0.0.1:3000/api/auth/magic-link");

    expect(getPublicOriginFromRequest(request)).toBe("http://127.0.0.1:3000");
  });
});
