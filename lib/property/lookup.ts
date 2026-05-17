import type { ListingPayload, NormalizedAddress, PropertyFacts } from "@/lib/types";
import { MissingProviderConfigError, ProviderRequestError, requiredProviderEnv } from "@/lib/provider-config";

export type PropertyLookupResult = Pick<
  ListingPayload,
  | "attomId"
  | "propertyDataSource"
  | "propertyEnrichedAt"
  | "propertyMatchConfidence"
  | "normalizedAddress"
  | "propertyFacts"
> & {
  message: string;
};

export type AddressSuggestion = {
  label: string;
  placeId?: string | null;
  secondaryLabel?: string | null;
  source: "google_places" | "manual";
};

type AttomProperty = Record<string, unknown>;
type GoogleAddressSuggestion = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
};
type GooglePlaceDetails = {
  formattedAddress?: string;
  addressComponents?: GoogleAddressComponent[];
};
type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  long_name?: string;
  short_name?: string;
  types?: string[];
};
type ResolvedGoogleAddress = {
  attomAddress: string;
  label: string;
};

const ATTOM_BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile";
const GOOGLE_PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const GOOGLE_PLACE_DETAILS_BASE_URL = "https://places.googleapis.com/v1/places";
const ATTOM_INCOMPLETE_ADDRESS_MESSAGE =
  "ATTOM needs a complete street address with city and state. Select a full dropdown address, or fill the details manually below.";
const ATTOM_UNREADABLE_ADDRESS_MESSAGE =
  "ATTOM could not read that address. Select a full street address from the dropdown with city, state, and ZIP, or fill the details manually below.";
const ATTOM_NO_MATCH_MESSAGE = "No ATTOM match found. Fill the details manually below or use text autofill.";
const US_STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC"
};

export async function searchListingAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 3) return [];

  const apiKey = requiredProviderEnv("GOOGLE_PLACES_API_KEY", "listing address autocomplete");
  const response = await fetch(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat"
    },
    body: JSON.stringify({
      input: cleanQuery,
      languageCode: "en",
      regionCode: "us",
      includedPrimaryTypes: ["street_address", "premise", "subpremise"]
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new ProviderRequestError("Google Places", `Google Places address lookup failed with ${response.status}`);
  }

  const payload = (await response.json()) as { suggestions?: GoogleAddressSuggestion[] };
  const suggestions: AddressSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of payload.suggestions ?? []) {
    const place = suggestion.placePrediction;
    const label =
      place?.text?.text ??
      [place?.structuredFormat?.mainText?.text, place?.structuredFormat?.secondaryText?.text]
        .filter(Boolean)
        .join(", ");
    if (!label || seen.has(normalizeAddressSuggestion(label))) continue;
    seen.add(normalizeAddressSuggestion(label));
    suggestions.push({
      label,
      placeId: place?.placeId ?? null,
      secondaryLabel: place?.structuredFormat?.secondaryText?.text ?? null,
      source: "google_places"
    });
  }

  return suggestions.slice(0, 5);
}

export async function lookupPropertyByAddress(
  address: string,
  options: { placeId?: string | null } = {}
): Promise<PropertyLookupResult> {
  const cleanAddress = address.trim();
  if (!cleanAddress) {
    throw new Error("Address is required");
  }

  const apiKey = requiredProviderEnv("ATTOM_API_KEY", "listing property lookup");
  const googleAddress = await safeResolveGooglePlaceAddress(options.placeId);
  const lookupAddress = googleAddress?.attomAddress ?? cleanAddress;
  const displayAddress = googleAddress?.label ?? cleanAddress;

  const url = new URL(process.env.ATTOM_API_BASE_URL || ATTOM_BASE_URL);
  const attomAddress = normalizeAttomRequestAddress(lookupAddress);
  const { address1, address2 } = splitAddress(attomAddress);
  if (!isSpecificAttomAddress(address1, address2)) {
    return manualPropertyLookup(displayAddress, ATTOM_INCOMPLETE_ADDRESS_MESSAGE);
  }
  if (address2) {
    url.searchParams.set("address1", address1);
    url.searchParams.set("address2", address2);
  } else {
    url.searchParams.set("address", cleanAddress);
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      apikey: apiKey
    },
    cache: "no-store"
  });

  if (response.status === 400) {
    return manualPropertyLookup(displayAddress, ATTOM_UNREADABLE_ADDRESS_MESSAGE);
  }

  if (response.status === 404) {
    return manualPropertyLookup(displayAddress, ATTOM_NO_MATCH_MESSAGE);
  }

  if (!response.ok) {
    throw new ProviderRequestError(
      "ATTOM",
      `ATTOM lookup is unavailable right now (status ${response.status}). Check ATTOM API access, then fill the details manually below.`
    );
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const property = firstProperty(payload);
  if (!property) return manualPropertyLookup(displayAddress, ATTOM_NO_MATCH_MESSAGE);

  return normalizeAttomProperty(property, displayAddress);
}

export function normalizeAttomProperty(property: AttomProperty, fallbackAddress: string): PropertyLookupResult {
  const normalizedAddress: NormalizedAddress = {
    line1: stringAt(property, "address.line1"),
    city: stringAt(property, "address.locality"),
    state: stringAt(property, "address.countrySubd"),
    postalCode: stringAt(property, "address.postal1"),
    label: stringAt(property, "address.oneLine") ?? fallbackAddress
  };

  const propertyFacts: PropertyFacts = removeEmpty({
    beds: numberAt(property, ["building.rooms.beds", "building.rooms.bedrooms", "summary.beds"]),
    baths: numberAt(property, ["building.rooms.bathsTotal", "building.rooms.bathsFull", "summary.baths"]),
    sqft: numberAt(property, [
      "building.size.livingSize",
      "building.size.grossSizeAdjusted",
      "building.size.bldgSize",
      "building.size.grossSize"
    ]),
    propertyType: stringAt(property, "summary.propLandUse") ?? stringAt(property, "summary.propertyType"),
    yearBuilt: numberAt(property, ["summary.yearBuilt", "building.summary.yearBuilt"]),
    lotSizeSqft: numberAt(property, ["lot.lotSize2", "lot.lotSizeSqft"]),
    stories: numberAt(property, ["building.summary.levels", "building.summary.stories"]),
    parking: stringAt(property, "building.parking.prkgType") ?? stringAt(property, "building.parking.parkingType"),
    assessedValue: numberAt(property, [
      "assessment.assessed.assdTtlValue",
      "assessment.assessed.assdImprValue",
      "assessment.market.mktTtlValue"
    ]),
    taxAnnualAmount: numberAt(property, ["assessment.tax.taxAmt"]),
    sourceUpdatedAt: stringAt(property, "vintage.pubDate") ?? stringAt(property, "vintage.lastModified")
  });

  const attomId = stringAt(property, "identifier.attomId") ?? stringAt(property, "identifier.Id");
  return {
    attomId: attomId ?? null,
    propertyDataSource: "attom",
    propertyEnrichedAt: new Date().toISOString(),
    propertyMatchConfidence: attomId ? 0.95 : 0.82,
    normalizedAddress,
    propertyFacts,
    message: "Property facts found. Review anything the agent has more recent context on."
  };
}

export function fixturePropertyLookup(address: string, message = "Property lookup is in fixture mode. Review and fill any missing facts."): PropertyLookupResult {
  return basePropertyLookup(address, "fixture", 0.35, message);
}

export function manualPropertyLookup(address: string, message = "No provider facts found. Review and fill the fields manually."): PropertyLookupResult {
  return basePropertyLookup(address, "manual", 0.3, message);
}

function basePropertyLookup(
  address: string,
  propertyDataSource: "fixture" | "manual",
  propertyMatchConfidence: number,
  message: string
): PropertyLookupResult {
  const { city, state, postalCode } = looseAddressParts(address);
  return {
    attomId: null,
    propertyDataSource,
    propertyEnrichedAt: new Date().toISOString(),
    propertyMatchConfidence,
    normalizedAddress: {
      line1: address.split(",")[0]?.trim() || address,
      city,
      state,
      postalCode,
      label: address
    },
    propertyFacts: {},
    message
  };
}

function splitAddress(address: string) {
  const [line1, ...rest] = address.split(",").map((part) => part.trim()).filter(Boolean);
  return {
    address1: line1 || address,
    address2: rest.join(", ")
  };
}

async function safeResolveGooglePlaceAddress(placeId: string | null | undefined) {
  if (!placeId?.trim()) return null;
  try {
    return await resolveGooglePlaceAddress(placeId);
  } catch (error) {
    if (error instanceof MissingProviderConfigError) throw error;
    return null;
  }
}

async function resolveGooglePlaceAddress(placeId: string): Promise<ResolvedGoogleAddress | null> {
  const cleanPlaceId = placeId.trim();
  if (!cleanPlaceId) return null;

  const apiKey = requiredProviderEnv("GOOGLE_PLACES_API_KEY", "listing address details");
  const response = await fetch(`${GOOGLE_PLACE_DETAILS_BASE_URL}/${encodeURIComponent(cleanPlaceId)}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "formattedAddress,addressComponents"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new ProviderRequestError("Google Places", `Google Places address details failed with ${response.status}`);
  }

  const details = (await response.json()) as GooglePlaceDetails;
  return googlePlaceDetailsAddress(details);
}

function googlePlaceDetailsAddress(details: GooglePlaceDetails): ResolvedGoogleAddress | null {
  const formattedAddress = details.formattedAddress?.trim();
  const displayAddress = formattedAddress ? normalizeAttomRequestAddress(formattedAddress) : null;
  const streetNumber = addressComponent(details, "street_number");
  const route = addressComponent(details, "route");
  const city =
    addressComponent(details, "locality") ??
    addressComponent(details, "postal_town") ??
    addressComponent(details, "sublocality_level_1");
  const state = addressComponent(details, "administrative_area_level_1", "short");
  const postalCode = addressComponent(details, "postal_code");
  const postalCodeSuffix = addressComponent(details, "postal_code_suffix");
  const line1 = [streetNumber, route].filter(Boolean).join(" ").trim();
  const zip = [postalCode, postalCodeSuffix].filter(Boolean).join("-");

  if (line1 && city && state) {
    const attomAddress = `${line1}, ${city}, ${state}${zip ? ` ${zip}` : ""}`;
    return {
      attomAddress,
      label: displayAddress ?? attomAddress
    };
  }

  if (displayAddress) {
    return {
      attomAddress: displayAddress,
      label: displayAddress
    };
  }

  return null;
}

function addressComponent(details: GooglePlaceDetails, type: string, valueType: "long" | "short" = "long") {
  const component = details.addressComponents?.find((item) => item.types?.includes(type));
  if (!component) return null;
  const value =
    valueType === "short"
      ? component.shortText ?? component.short_name ?? component.longText ?? component.long_name
      : component.longText ?? component.long_name ?? component.shortText ?? component.short_name;
  return value?.trim() || null;
}

function normalizeAttomRequestAddress(address: string) {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  while (parts.length > 1 && isCountryPart(parts[parts.length - 1])) {
    parts.pop();
  }
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (lastPart) parts[parts.length - 1] = normalizeStatePart(lastPart);
  }
  return parts.join(", ") || address.trim();
}

function normalizeStatePart(part: string) {
  const cleanPart = part.replace(/\s+/g, " ").trim();
  const match = cleanPart.match(/^([A-Za-z][A-Za-z .'-]*?)(?:\s+(\d{5}(?:-\d{4})?))?$/);
  if (!match) return cleanPart;
  const state = match[1].replace(/\./g, "").toLowerCase();
  const stateCode = US_STATE_ABBREVIATIONS[state];
  if (!stateCode) return cleanPart;
  return match[2] ? `${stateCode} ${match[2]}` : stateCode;
}

function isCountryPart(part: string | undefined) {
  return /^(us|u\.s\.|usa|u\.s\.a\.|united states|united states of america)$/i.test(part?.trim() ?? "");
}

function isSpecificAttomAddress(address1: string, address2: string) {
  return /\d/.test(address1) && Boolean(address2.trim()) && /\b[A-Z]{2}\b/i.test(address2);
}

function looseAddressParts(address: string) {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  const city = parts.length >= 2 ? parts[parts.length - 2] : null;
  const stateZip = parts[parts.length - 1] ?? "";
  const stateZipMatch = stateZip.match(/\b([A-Z]{2})\b\s*(\d{5})?/i);
  return {
    city,
    state: stateZipMatch?.[1]?.toUpperCase() ?? null,
    postalCode: stateZipMatch?.[2] ?? null
  };
}

function firstProperty(payload: Record<string, unknown>): AttomProperty | null {
  const property = payload.property;
  if (Array.isArray(property)) return (property[0] as AttomProperty | undefined) ?? null;
  if (property && typeof property === "object") return property as AttomProperty;
  return null;
}

function stringAt(input: Record<string, unknown>, path: string) {
  const value = valueAt(input, path);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberAt(input: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = valueAt(input, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/[$,]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function valueAt(input: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, input);
}

function removeEmpty<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== "")) as T;
}

function normalizeAddressSuggestion(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
