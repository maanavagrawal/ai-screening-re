export class MissingProviderConfigError extends Error {
  readonly envVar: string;
  readonly feature: string;

  constructor(envVar: string, feature: string) {
    super(`${envVar} is required for ${feature}.`);
    this.name = "MissingProviderConfigError";
    this.envVar = envVar;
    this.feature = feature;
  }
}

export class ProviderRequestError extends Error {
  readonly provider: string;

  constructor(provider: string, message: string) {
    super(message);
    this.name = "ProviderRequestError";
    this.provider = provider;
  }
}

export function requiredProviderEnv(envVar: string, feature: string) {
  const value = process.env[envVar]?.trim();
  if (!value) throw new MissingProviderConfigError(envVar, feature);
  return value;
}

export function providerErrorStatus(error: unknown) {
  return error instanceof MissingProviderConfigError ? 503 : 502;
}

export function providerErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function providerConfigStatus() {
  const required = [
    ["ATTOM_API_KEY", "listing property lookup"],
    ["GOOGLE_PLACES_API_KEY", "buyer area autocomplete"]
  ] as const;
  const missing = required
    .filter(([envVar]) => !process.env[envVar]?.trim())
    .map(([envVar, feature]) => ({ envVar, feature }));

  return {
    ok: missing.length === 0,
    missing
  };
}
