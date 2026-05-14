import { describe, expect, it } from "vitest";
import { getMagicLinkMode } from "@/lib/auth/magic-link-mode";

const base = {
  hasPostgres: false,
  hasSupabase: false,
  hasSupabaseAnonKey: false,
  hasResend: false,
  isProduction: true,
  allowDevAgentAuth: false
};

describe("getMagicLinkMode", () => {
  it("requires email delivery for Railway Postgres production signup", () => {
    expect(getMagicLinkMode({ ...base, hasPostgres: true })).toBe("postgres_missing_email");
  });

  it("uses real magic-link email when Railway Postgres and Resend are configured", () => {
    expect(getMagicLinkMode({ ...base, hasPostgres: true, hasResend: true })).toBe("postgres_email");
  });

  it("does not silently enable dev sessions in production without an auth provider", () => {
    expect(getMagicLinkMode(base)).toBe("misconfigured");
  });

  it("keeps local setup convenient when production safeguards are not active", () => {
    expect(getMagicLinkMode({ ...base, isProduction: false })).toBe("dev_session");
  });

  it("does not send an immediate setup redirect for Supabase magic-link auth", () => {
    expect(getMagicLinkMode({ ...base, hasSupabase: true, hasSupabaseAnonKey: true })).toBe("supabase_email");
  });
});
