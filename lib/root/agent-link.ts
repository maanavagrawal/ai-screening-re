const RESERVED_SLUGS = new Set([
  "api",
  "auth",
  "dashboard",
  "setup",
  "signup",
  "agents",
  "agent",
  "admin",
  "health",
  "_next"
]);

function normalizeSlug(value: string | null | undefined) {
  const slug = value?.trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return null;
  if (RESERVED_SLUGS.has(slug)) return null;
  return slug;
}

export function parseAgentLinkInput(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const [firstSegment] = url.pathname.split("/").filter(Boolean);
      return normalizeSlug(firstSegment);
    } catch {
      return null;
    }
  }

  const withoutQuery = trimmed.split(/[?#]/)[0];
  const [firstSegment] = withoutQuery.split("/").filter(Boolean);
  return normalizeSlug(firstSegment ?? withoutQuery);
}

export function isReservedAgentSlug(value: string) {
  return RESERVED_SLUGS.has(value.trim().toLowerCase());
}
