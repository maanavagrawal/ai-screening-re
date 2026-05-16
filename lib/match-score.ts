import type { Listing, Preferences } from "@/lib/types";

type Extraction = NonNullable<Preferences["extraction"]>;

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function extractionFor(preferences: Preferences): Partial<Extraction> {
  return {
    ...(preferences.extraction ?? {}),
    ...(preferences.accepted_extraction ?? {})
  };
}

function includesToken(values: string[] | undefined, value: string | null) {
  if (!value) return false;
  const target = normalizeToken(value);
  return values?.some((item) => normalizeToken(item) === target) ?? false;
}

function areaLabels(preferences: Preferences) {
  return [
    ...(preferences.neighborhoods ?? []),
    ...(preferences.selected_areas?.flatMap((area) => [area.label, area.parentLabel ?? ""]) ?? [])
  ].filter(Boolean);
}

function countTokenMatches(values: string[], wanted: string[] | undefined) {
  const wantedSet = new Set((wanted ?? []).map(normalizeToken));
  return values.filter((value) => wantedSet.has(normalizeToken(value))).length;
}

export function normalizePreferences(preferences: Preferences): Preferences {
  const extraction = extractionFor(preferences);
  const beds =
    preferences.beds ??
    (preferences.bedrooms === "5_plus" ? 5 : preferences.bedrooms ? Number(preferences.bedrooms) : undefined) ??
    extraction?.beds ??
    undefined;
  const baths =
    preferences.baths ??
    (preferences.bathrooms === "4_plus" ? 4 : preferences.bathrooms ? Number(preferences.bathrooms) : undefined) ??
    extraction?.baths ??
    undefined;

  const budgetMin = preferences.budget_min ?? extraction.budget_min ?? undefined;
  const budgetMax = preferences.budget_max ?? extraction.budget_max ?? undefined;

  return {
    ...preferences,
    beds,
    baths,
    budget_min: budgetMin != null && budgetMax != null && budgetMin > budgetMax ? budgetMax : budgetMin,
    budget_max: budgetMin != null && budgetMax != null && budgetMin > budgetMax ? budgetMin : budgetMax,
    neighborhoods: areaLabels(preferences).length > 0 ? areaLabels(preferences) : extraction.neighborhoods,
    must_haves:
      preferences.must_haves && preferences.must_haves.length > 0 ? preferences.must_haves : extraction.must_haves,
    deal_breakers:
      preferences.deal_breakers && preferences.deal_breakers.length > 0
        ? preferences.deal_breakers
        : extraction.deal_breakers
  };
}

export function matchScore(listing: Listing, preferences: Preferences): number {
  const prefs = normalizePreferences(preferences);
  let score = 0;

  const minOk = prefs.budget_min == null || listing.price >= prefs.budget_min;
  const maxOk = prefs.budget_max == null || listing.price <= prefs.budget_max;
  if ((prefs.budget_min != null || prefs.budget_max != null) && minOk && maxOk) {
    score += 2;
  }

  if (prefs.beds != null && listing.beds >= prefs.beds) score += 2;
  if (prefs.baths != null && listing.baths >= prefs.baths) score += 1;

  if (prefs.neighborhoods?.length && listing.neighborhood) {
    score += includesToken(prefs.neighborhoods, listing.neighborhood) ? 1 : 0;
  }

  const featureMatches = countTokenMatches(listing.features, prefs.must_haves);
  score += Math.min(featureMatches, 5);

  const dealBreakerMatches = countTokenMatches(listing.deal_breaker_flags, prefs.deal_breakers);
  score -= dealBreakerMatches * 3;

  return score;
}

export function rankListings(listings: Listing[], preferences: Preferences) {
  const ranked = listings
    .map((listing) => ({ listing, score: matchScore(listing, preferences) }))
    .filter((item) => item.score >= 3)
    .sort((a, b) => {
      const scoreDelta = b.score - a.score;
      if (scoreDelta !== 0) return scoreDelta;

      const pocketDelta = Number(b.listing.is_pocket) - Number(a.listing.is_pocket);
      if (pocketDelta !== 0) return pocketDelta;

      const priceDelta = a.listing.price - b.listing.price;
      if (priceDelta !== 0) return priceDelta;

      return a.listing.id.localeCompare(b.listing.id);
    });

  const firstPocketIndex = ranked.findIndex((item) => item.listing.is_pocket);
  if (firstPocketIndex > 0) {
    const [pocket] = ranked.splice(firstPocketIndex, 1);
    ranked.unshift(pocket);
  }

  return ranked.slice(0, 10);
}
