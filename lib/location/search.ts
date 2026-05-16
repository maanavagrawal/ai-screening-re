import type { Agent, Listing, SelectedArea } from "@/lib/types";

export type LocationSuggestion = SelectedArea & {
  attribution?: "google" | "agent" | "manual";
};

type GoogleSuggestion = {
  placePrediction?: {
    placeId?: string;
    types?: string[];
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
};

export async function searchLocationSuggestions(input: {
  query: string;
  agent: Agent;
  listings?: Listing[];
}): Promise<LocationSuggestion[]> {
  const query = input.query.trim();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey && query.length >= 2) {
    const google = await googleLocationSuggestions(query, apiKey);
    if (google.length) return google;
  }

  return fixtureLocationSuggestions({
    query,
    agent: input.agent,
    listings: input.listings ?? []
  });
}

export function fixtureLocationSuggestions(input: {
  query: string;
  agent: Pick<Agent, "market" | "neighborhoods">;
  listings?: Array<Pick<Listing, "neighborhood">>;
}): LocationSuggestion[] {
  const query = normalize(input.query);
  const known = Array.from(
    new Set([
      ...input.agent.neighborhoods,
      ...((input.listings ?? []).map((listing) => listing.neighborhood).filter(Boolean) as string[])
    ])
  );

  const suggestions = known
    .filter((label) => !query || normalize(label).includes(query))
    .slice(0, 6)
    .map<LocationSuggestion>((label) => ({
      label,
      source: "agent_suggestion",
      type: "neighborhood",
      parentLabel: input.agent.market,
      attribution: "agent"
    }));

  if (input.query.trim() && !suggestions.some((item) => normalize(item.label) === query)) {
    suggestions.push({
      label: input.query.trim(),
      source: "manual",
      type: "custom",
      parentLabel: input.agent.market,
      attribution: "manual"
    });
  }

  return suggestions;
}

async function googleLocationSuggestions(query: string, apiKey: string): Promise<LocationSuggestion[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types"
    },
    body: JSON.stringify({
      input: query,
      languageCode: "en",
      regionCode: "us",
      includedPrimaryTypes: ["locality", "neighborhood", "postal_code", "administrative_area_level_2", "school"]
    }),
    cache: "no-store"
  });

  if (!response.ok) return [];
  const payload = (await response.json()) as { suggestions?: GoogleSuggestion[] };
  const suggestions: LocationSuggestion[] = [];
  for (const suggestion of payload.suggestions ?? []) {
    const place = suggestion.placePrediction;
    if (!place) continue;
    const label = place.structuredFormat?.mainText?.text ?? place.text?.text;
    if (!label) continue;
    suggestions.push({
      label,
      placeId: place.placeId ?? null,
      source: "google_places",
      type: typeFromGoogleTypes(place.types ?? []),
      parentLabel: place.structuredFormat?.secondaryText?.text ?? null,
      attribution: "google"
    });
  }
  return suggestions;
}

function typeFromGoogleTypes(types: string[]): SelectedArea["type"] {
  if (types.includes("postal_code")) return "postal_code";
  if (types.includes("school") || types.includes("school_district")) return "school_district";
  if (types.includes("locality") || types.includes("administrative_area_level_3")) return "city";
  if (types.includes("neighborhood") || types.includes("sublocality")) return "neighborhood";
  if (types.includes("administrative_area_level_1") || types.includes("administrative_area_level_2")) return "region";
  return "custom";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
