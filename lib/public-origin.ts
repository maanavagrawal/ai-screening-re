type HeaderLike = {
  get(name: string): string | null;
};

const INTERNAL_HOSTS = new Set(["0.0.0.0", "::", "[::]"]);

export function getPublicOriginFromRequest(request: Request) {
  return getPublicOrigin({
    headers: request.headers,
    requestUrl: request.url
  });
}

export function getPublicOriginFromHeaders(headers: HeaderLike, requestUrl?: string) {
  return getPublicOrigin({ headers, requestUrl });
}

function getPublicOrigin(input: { headers: HeaderLike; requestUrl?: string }) {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;

  const forwardedHost = firstHeaderValue(input.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(input.headers.get("host"));
  if (host) {
    const forwardedProto = firstHeaderValue(input.headers.get("x-forwarded-proto"));
    const protocol = forwardedProto ?? (isLocalHost(host) ? "http" : "https");
    const origin = normalizeOrigin(`${protocol}://${host}`);
    if (origin) return origin;
  }

  return normalizeOrigin(input.requestUrl);
}

function normalizeOrigin(value?: string | null) {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (INTERNAL_HOSTS.has(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function isLocalHost(host: string) {
  const clean = host.split(":")[0] ?? host;
  return clean === "localhost" || clean === "127.0.0.1" || clean.startsWith("10.");
}
