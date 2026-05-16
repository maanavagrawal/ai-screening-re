export type MagicLinkMode =
  | "postgres_email"
  | "postgres_dev_link"
  | "postgres_missing_email"
  | "dev_session"
  | "misconfigured";

export type MagicLinkModeInput = {
  hasPostgres: boolean;
  hasResend: boolean;
  isProduction: boolean;
  allowDevAgentAuth: boolean;
};

export function getMagicLinkMode(input: MagicLinkModeInput): MagicLinkMode {
  if (input.hasPostgres) {
    if (input.hasResend) return "postgres_email";
    return input.isProduction && !input.allowDevAgentAuth ? "postgres_missing_email" : "postgres_dev_link";
  }

  if (!input.isProduction || input.allowDevAgentAuth) return "dev_session";

  return "misconfigured";
}
