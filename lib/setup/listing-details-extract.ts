import { z } from "zod";
import { DEAL_BREAKERS, MUST_HAVES } from "@/lib/constants";

const ListingDetailsSchema = z.object({
  address: z.string().nullable(),
  price: z.number().int().positive().nullable(),
  beds: z.number().min(0).nullable(),
  baths: z.number().min(0).nullable(),
  sqft: z.number().int().positive().nullable(),
  neighborhood: z.string().nullable(),
  property_type: z.string().nullable(),
  features: z.array(z.enum(MUST_HAVES)),
  dealBreakerFlags: z.array(z.enum(DEAL_BREAKERS)),
  description: z.string().nullable(),
  agent_note: z.string().nullable(),
  confidence: z.number().min(0).max(1)
});

export type ExtractedListingDetails = z.infer<typeof ListingDetailsSchema>;

type ExtractInput = {
  text: string;
  neighborhoods?: string[];
};

const featureMatchers: Array<[typeof MUST_HAVES[number], RegExp]> = [
  ["yard", /\b(yard|fenced|garden|outdoor space)\b/i],
  ["garage", /\bgarage|covered parking\b/i],
  ["pool", /\bpool\b/i],
  ["home_office", /\b(office|den|work from home|wfh)\b/i],
  ["updated_kitchen", /\b(updated|renovated|remodeled).{0,30}kitchen|kitchen.{0,30}(updated|renovated|remodeled)\b/i],
  ["open_floor_plan", /\bopen (floor plan|concept|layout)\b/i],
  ["walkable", /\b(walkable|walk to|steps from)\b/i],
  ["quiet_street", /\bquiet street|cul-?de-?sac\b/i],
  ["new_construction", /\bnew construction|new build|built in 20\d{2}\b/i]
];

const dealBreakerMatchers: Array<[typeof DEAL_BREAKERS[number], RegExp]> = [
  ["hoa", /\bhoa\b/i],
  ["fixer_upper", /\b(fixer|needs work|as-is|renovation|tlc)\b/i],
  ["busy_street", /\b(busy street|main road|arterial)\b/i],
  ["long_commute", /\b(long commute|far from downtown|remote)\b/i],
  ["shared_walls", /\b(shared wall|duplex|condo|townhome|townhouse)\b/i]
];

function canUseAnthropic() {
  return process.env.DISABLE_AI !== "1" && Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function extractListingDetailsFromText(input: ExtractInput): Promise<ExtractedListingDetails> {
  const fallback = fallbackListingDetails(input);
  if (!canUseAnthropic()) return fallback;

  try {
    const [{ anthropic }, { generateObject }] = await Promise.all([
      import("@ai-sdk/anthropic"),
      import("ai")
    ]);
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: ListingDetailsSchema,
      system: [
        "You extract structured real estate listing details from text an agent pasted.",
        "The text may be an MLS remarks block, Instagram caption, flyer copy, email, or partial notes.",
        "Only extract facts that are clearly present. Use null for missing required facts.",
        "Match neighborhoods to the provided neighborhood list when possible, but do not invent one.",
        `Canonical features: ${MUST_HAVES.join(", ")}.`,
        `Canonical deal-breaker flags: ${DEAL_BREAKERS.join(", ")}.`,
        "agent_note should be a short first-person seller-agent take if the text includes enough signal; otherwise null.",
        "description should be a concise public listing description from the provided facts, not hype."
      ].join("\n"),
      prompt: JSON.stringify({
        neighborhoods: input.neighborhoods ?? [],
        text: input.text
      })
    });
    return object;
  } catch {
    return fallback;
  }
}

export function fallbackListingDetails(input: ExtractInput): ExtractedListingDetails {
  const text = input.text.replace(/\s+/g, " ").trim();
  const address = extractAddress(input.text);
  const price = extractPrice(text);
  const beds = extractNumberBefore(text, /\b(beds?|bd|br|bedrooms?)\b/i);
  const baths = extractNumberBefore(text, /\b(baths?|ba|bathrooms?)\b/i);
  const sqft = extractSqft(text);
  const neighborhood = input.neighborhoods?.find((item) => new RegExp(`\\b${escapeRegExp(item)}\\b`, "i").test(text)) ?? null;
  const features = featureMatchers.filter(([, matcher]) => matcher.test(text)).map(([key]) => key);
  const dealBreakerFlags = dealBreakerMatchers.filter(([, matcher]) => matcher.test(text)).map(([key]) => key);
  const property_type = extractPropertyType(text);
  const description = firstSentence(text, 180);

  return {
    address,
    price,
    beds,
    baths,
    sqft,
    neighborhood,
    property_type,
    features,
    dealBreakerFlags,
    description,
    agent_note: description ? `${description.replace(/\.$/, "")}.` : null,
    confidence: [address, price, beds, baths].filter(Boolean).length / 4
  };
}

function extractAddress(text: string) {
  const line = text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => /^\d{2,6}\s+.+\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|ct|court|pl|place|blvd|circle|cir|way|terrace|ter)\b/i.test(item));
  return line ?? null;
}

function extractPrice(text: string) {
  const match = text.match(/\$\s?(\d+(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s?(m|million|k)?/i);
  if (!match) return null;
  const value = Number(match[1].replaceAll(",", ""));
  if (!Number.isFinite(value)) return null;
  const suffix = match[2]?.toLowerCase();
  if (suffix?.startsWith("m")) return Math.round(value * 1_000_000);
  if (suffix === "k") return Math.round(value * 1_000);
  return Math.round(value);
}

function extractNumberBefore(text: string, label: RegExp) {
  const match = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${label.source}`, "i"));
  return match ? Number(match[1]) : null;
}

function extractSqft(text: string) {
  const match = text.match(/\b(\d{1,3}(?:,\d{3})+|\d{3,5})\s*(sq\.?\s*ft\.?|sqft|sf)\b/i);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

function extractPropertyType(text: string) {
  if (/\bcondo\b/i.test(text)) return "condo";
  if (/\btownhome|townhouse\b/i.test(text)) return "townhouse";
  if (/\bmulti-?family|duplex|triplex\b/i.test(text)) return "multi-family";
  if (/\bsingle[- ]family|house|home\b/i.test(text)) return "house";
  return null;
}

function firstSentence(text: string, max: number) {
  const sentence = text.split(/(?<=[.!?])\s+/)[0]?.trim();
  if (!sentence) return null;
  return sentence.length > max ? `${sentence.slice(0, max - 1).trim()}...` : sentence;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
