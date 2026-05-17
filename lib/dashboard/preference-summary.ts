import { formatCurrency } from "@/lib/formatting";
import type { Preferences } from "@/lib/types";

export type PreferenceSummaryItem = {
  label: string;
  value: string;
};

export function preferenceSummary(preferences: Preferences): PreferenceSummaryItem[] {
  const items: PreferenceSummaryItem[] = [];
  const budget = budgetLabel(preferences);
  const locations = locationLabel(preferences);
  const bedBath = bedBathLabel(preferences);
  const timeline = preferences.timeline?.preset ? preferences.timeline.preset.replaceAll("_", " ") : null;
  const propertyPreference = propertyPreferenceLabel(preferences);

  if (budget) items.push({ label: "Budget", value: budget });
  if (locations) items.push({ label: "Areas", value: locations });
  if (bedBath) items.push({ label: "Beds/baths", value: bedBath });
  if (timeline) items.push({ label: "Timeline", value: timeline });
  if (preferences.financing) items.push({ label: "Financing", value: preferences.financing.replaceAll("_", " ") });
  if (propertyPreference) items.push({ label: "Home type", value: propertyPreference });
  if (preferences.must_haves?.length) items.push({ label: "Must-haves", value: joinHuman(preferences.must_haves) });
  if (preferences.deal_breakers?.length) items.push({ label: "Avoids", value: joinHuman(preferences.deal_breakers) });
  if (preferences.anything_else) items.push({ label: "Notes", value: preferences.anything_else });

  return items;
}

function propertyPreferenceLabel(preferences: Preferences) {
  if (preferences.property_type?.length) return joinHuman(preferences.property_type.map(propertyTypeLabel));
  if (preferences.property_category === "single_family") return "Single-family";
  if (preferences.property_category === "multi_family") return "Multifamily";
  if (preferences.property_category === "both") return "Single-family, multifamily";
  return null;
}

export function locationLabel(preferences: Preferences) {
  const selected = preferences.selected_areas?.map((area) => area.label).filter(Boolean) ?? [];
  const legacy = preferences.neighborhoods ?? [];
  const locations = Array.from(new Set([...selected, ...legacy]));
  if (!locations.length && preferences.open_to_suggestions) return "Open to suggestions";
  if (!locations.length) return null;
  return `${joinHuman(locations)}${preferences.open_to_suggestions ? " + open to suggestions" : ""}`;
}

function budgetLabel(preferences: Preferences) {
  if (preferences.budget_min != null && preferences.budget_max != null) {
    return `${formatCurrency(preferences.budget_min)} - ${formatCurrency(preferences.budget_max)}`;
  }
  if (preferences.budget_max != null) return `Up to ${formatCurrency(preferences.budget_max)}`;
  if (preferences.budget_min != null) return `${formatCurrency(preferences.budget_min)}+`;
  return null;
}

function bedBathLabel(preferences: Preferences) {
  const beds = preferences.beds ?? bedroomNumber(preferences.bedrooms);
  const baths = preferences.baths ?? bathroomNumber(preferences.bathrooms);
  if (beds && baths) return `${beds}+ bed, ${baths}+ bath`;
  if (beds) return `${beds}+ bed`;
  if (baths) return `${baths}+ bath`;
  return null;
}

function bedroomNumber(value: Preferences["bedrooms"]) {
  if (!value) return null;
  return value === "5_plus" ? 5 : Number(value);
}

function bathroomNumber(value: Preferences["bathrooms"]) {
  if (!value) return null;
  return value === "4_plus" ? 4 : Number(value);
}

function joinHuman(values: string[]) {
  return values.map((value) => value.replaceAll("_", " ")).join(", ");
}

function propertyTypeLabel(value: string) {
  if (value === "house") return "Detached house";
  if (value === "multi_family") return "Multifamily";
  if (value === "fourplex") return "Fourplex / quadplex";
  if (value === "five_plus_units") return "5+ units";
  return value;
}
