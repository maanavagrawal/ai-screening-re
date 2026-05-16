import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function configuredSecret() {
  return process.env.INTERNAL_API_SECRET?.trim() || null;
}

function requestToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }

  return request.headers.get("x-internal-secret")?.trim() || null;
}

export function isInternalRequestAuthorized(request: Request) {
  const secret = configuredSecret();
  if (!secret) return process.env.NODE_ENV !== "production";

  const token = requestToken(request);
  if (!token) return false;

  const expected = Buffer.from(secret);
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function requireInternalRequest(request: Request) {
  const secret = configuredSecret();
  if (isInternalRequestAuthorized(request)) return null;

  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Internal API secret is not configured" }, { status: 503 });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
