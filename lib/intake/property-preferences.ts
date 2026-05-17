export const PROPERTY_CATEGORY_OPTIONS = [
  {
    label: "Single-family",
    value: "single_family",
    description: "Detached homes, condos, or townhomes."
  },
  {
    label: "Multifamily",
    value: "multi_family",
    description: "Duplexes, triplexes, fourplexes, or 5+ units."
  },
  {
    label: "Both",
    value: "both",
    description: "I am open to either path."
  }
] as const;

export const SINGLE_FAMILY_PROPERTY_TYPE_OPTIONS = [
  { label: "Detached house", value: "house" },
  { label: "Condo", value: "condo" },
  { label: "Townhouse", value: "townhouse" }
] as const;

export const MULTIFAMILY_PROPERTY_TYPE_OPTIONS = [
  { label: "Duplex", value: "duplex" },
  { label: "Triplex", value: "triplex" },
  { label: "Fourplex / quadplex", value: "fourplex" },
  { label: "5+ units", value: "five_plus_units" }
] as const;

export const LEGACY_MULTIFAMILY_PROPERTY_TYPE = "multi_family";

export type PropertyCategory = (typeof PROPERTY_CATEGORY_OPTIONS)[number]["value"];
export type SingleFamilyPropertyType = (typeof SINGLE_FAMILY_PROPERTY_TYPE_OPTIONS)[number]["value"];
export type MultifamilyPropertyType = (typeof MULTIFAMILY_PROPERTY_TYPE_OPTIONS)[number]["value"];
export type PropertyType = SingleFamilyPropertyType | MultifamilyPropertyType | typeof LEGACY_MULTIFAMILY_PROPERTY_TYPE;

const singleFamilyValues = new Set<string>(SINGLE_FAMILY_PROPERTY_TYPE_OPTIONS.map((option) => option.value));
const multifamilyValues = new Set<string>([
  LEGACY_MULTIFAMILY_PROPERTY_TYPE,
  ...MULTIFAMILY_PROPERTY_TYPE_OPTIONS.map((option) => option.value)
]);
const propertyTypeValues = new Set<string>([
  ...SINGLE_FAMILY_PROPERTY_TYPE_OPTIONS.map((option) => option.value),
  ...MULTIFAMILY_PROPERTY_TYPE_OPTIONS.map((option) => option.value),
  LEGACY_MULTIFAMILY_PROPERTY_TYPE
]);

export function propertyCategoryIncludesSingleFamily(category: PropertyCategory | undefined) {
  return category === "single_family" || category === "both";
}

export function propertyCategoryIncludesMultifamily(category: PropertyCategory | undefined) {
  return category === "multi_family" || category === "both";
}

export function categoryFromPropertyTypes(propertyTypes: readonly string[] | undefined): PropertyCategory | undefined {
  const hasSingleFamily = hasSingleFamilyPropertyTypes(propertyTypes);
  const hasMultifamily = hasMultifamilyPropertyTypes(propertyTypes);
  if (hasSingleFamily && hasMultifamily) return "both";
  if (hasSingleFamily) return "single_family";
  if (hasMultifamily) return "multi_family";
  return undefined;
}

export function hasSingleFamilyPropertyTypes(propertyTypes: readonly string[] | undefined) {
  return propertyTypes?.some((value) => singleFamilyValues.has(value)) ?? false;
}

export function hasMultifamilyPropertyTypes(propertyTypes: readonly string[] | undefined) {
  return propertyTypes?.some((value) => multifamilyValues.has(value)) ?? false;
}

export function combinePropertyTypes(input: {
  property_category?: PropertyCategory;
  single_family_property_type?: readonly string[];
  multifamily_property_type?: readonly string[];
  property_type?: readonly string[];
}): PropertyType[] {
  const category = input.property_category ?? categoryFromPropertyTypes(input.property_type);
  const values: PropertyType[] = [];
  if (propertyCategoryIncludesSingleFamily(category)) values.push(...toPropertyTypes(input.single_family_property_type));
  if (propertyCategoryIncludesMultifamily(category)) values.push(...toPropertyTypes(input.multifamily_property_type));
  return Array.from(new Set(values.length ? values : toPropertyTypes(input.property_type)));
}

function toPropertyTypes(values: readonly string[] | undefined): PropertyType[] {
  return (values ?? []).filter((value): value is PropertyType => propertyTypeValues.has(value));
}
