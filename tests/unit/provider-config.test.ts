import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MissingProviderConfigError,
  providerConfigStatus,
  requiredProviderEnv
} from "@/lib/provider-config";

describe("provider config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports missing required property and location providers", () => {
    vi.stubEnv("ATTOM_API_KEY", "");
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");

    expect(providerConfigStatus()).toEqual({
      ok: false,
      missing: [
        { envVar: "ATTOM_API_KEY", feature: "listing property lookup" },
        { envVar: "GOOGLE_PLACES_API_KEY", feature: "buyer area autocomplete" }
      ]
    });
  });

  it("returns configured provider env values", () => {
    vi.stubEnv("ATTOM_API_KEY", "attom-test-key");

    expect(requiredProviderEnv("ATTOM_API_KEY", "listing property lookup")).toBe("attom-test-key");
  });

  it("throws a named config error for missing values", () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");

    expect(() => requiredProviderEnv("GOOGLE_PLACES_API_KEY", "buyer area autocomplete")).toThrow(
      MissingProviderConfigError
    );
  });
});
