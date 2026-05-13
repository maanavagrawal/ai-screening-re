import {
  AgentBriefSchema,
  FreeTextExtractionSchema,
  IntakeNextQuestionDecisionSchema,
  PerListingMatchReasonsSchema,
  WhatsNewResponseSchema,
  type FreeTextExtractionResult,
  type IntakeAnswers,
  type QuestionId
} from "@/lib/ai/schemas";
import {
  agentBriefPrompt,
  agentVoice,
  extractionPrompt,
  matchReasonsPrompt,
  nextQuestionPrompt,
  whatsNewPrompt
} from "@/lib/ai/prompts";
import type { Agent, EventRecord, Lead, Listing, Preferences } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";

const MODEL = "claude-sonnet-4-5";
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 10_000);

function canUseAnthropic() {
  return process.env.DISABLE_AI !== "1" && Boolean(process.env.ANTHROPIC_API_KEY);
}

async function withAiTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("AI request timed out.")), AI_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timer]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function generateAnthropicObject<T>(
  schema: unknown,
  prompt: { system: string; prompt: string }
): Promise<T> {
  const [{ anthropic }, { generateObject }] = await Promise.all([
    import("@ai-sdk/anthropic"),
    import("ai")
  ]);
  const { object } = await withAiTimeout(
    generateObject({
      model: anthropic(MODEL),
      schema: schema as never,
      ...prompt
    })
  );
  return object as T;
}

const emptyConfidence = {
  beds: 0,
  baths: 0,
  budget_min: 0,
  budget_max: 0,
  neighborhoods: 0,
  must_haves: 0,
  deal_breakers: 0,
  family_context: 0,
  work_context: 0,
  timeline_hint: 0,
  financing_hint: 0
};

function isTruthy<T>(value: T | null | undefined | false): value is T {
  return Boolean(value);
}

function parseBudgetAmount(value: string, suffix?: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;

  if (suffix?.toLowerCase().startsWith("m")) return Math.round(amount * 1_000_000);
  if (suffix?.toLowerCase() === "k") return Math.round(amount * 1_000);
  if (amount >= 100_000) return Math.round(amount);
  if (amount >= 100) return Math.round(amount * 1_000);
  return Math.round(amount);
}

function parseBudgetBounds(text: string) {
  const range = text.match(
    /\$?\s?(\d+(?:\.\d+)?)\s?(m(?:illion)?|k)?\s*(?:-|to|through|and)\s*\$?\s?(\d+(?:\.\d+)?)\s?(m(?:illion)?|k)?/i
  );

  if (range) {
    const firstSuffix = range[2] ?? range[4];
    const secondSuffix = range[4] ?? range[2];
    const first = parseBudgetAmount(range[1], firstSuffix);
    const second = parseBudgetAmount(range[3], secondSuffix);
    if (first != null && second != null) {
      return {
        min: Math.min(first, second),
        max: Math.max(first, second)
      };
    }
  }

  const budget = parseBudget(text);
  return { min: null, max: budget };
}

function parseBudget(text: string) {
  const million = text.match(/\$?\s?(\d+(?:\.\d+)?)\s?m(?:illion)?/i);
  if (million) return Math.round(Number(million[1]) * 1_000_000);

  const k = text.match(/\$?\s?(\d{3,4})\s?k/i);
  if (k) return Number(k[1]) * 1_000;

  const plain = text.match(/\$?\s?(\d{3,4})(?:,?000)?/);
  if (plain) {
    const value = Number(plain[1]);
    return value < 10_000 ? value * 1_000 : value;
  }

  if (/under a million|below a million|less than a million/i.test(text)) return 1_000_000;
  return null;
}

export function fallbackExtraction(agent: Agent, freeText: string): FreeTextExtractionResult {
  const lower = freeText.toLowerCase();
  const bedsMatch = lower.match(/(\d+)\s*(?:bed|br|bedroom)/);
  const bathsMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/);
  const budget = parseBudgetBounds(lower);
  const neighborhoods = agent.neighborhoods.filter((item) => lower.includes(item.toLowerCase()));
  const mustHaveCandidates = [
    lower.includes("yard") || lower.includes("dog") ? "yard" : null,
    lower.includes("garage") || lower.includes("parking") ? "garage" : null,
    lower.includes("pool") ? "pool" : null,
    lower.includes("office") || lower.includes("work from home") || lower.includes("wfh")
      ? "home_office"
      : null,
    lower.includes("updated kitchen") || lower.includes("new kitchen") ? "updated_kitchen" : null,
    lower.includes("open floor") ? "open_floor_plan" : null,
    lower.includes("walkable") || lower.includes("walk to") ? "walkable" : null,
    lower.includes("quiet") ? "quiet_street" : null,
    lower.includes("new construction") ? "new_construction" : null
  ] satisfies Array<FreeTextExtractionResult["must_haves"][number] | null>;
  const must_haves = mustHaveCandidates.filter(isTruthy);
  const dealBreakerCandidates = [
    lower.includes("no hoa") || lower.includes("avoid hoa") ? "hoa" : null,
    lower.includes("no fixer") || lower.includes("nothing major") ? "fixer_upper" : null,
    lower.includes("busy street") ? "busy_street" : null,
    lower.includes("commute") && (lower.includes("short") || lower.includes("long")) ? "long_commute" : null,
    lower.includes("shared walls") ? "shared_walls" : null
  ] satisfies Array<FreeTextExtractionResult["deal_breakers"][number] | null>;
  const deal_breakers = dealBreakerCandidates.filter(isTruthy);

  return {
    beds: bedsMatch ? Number(bedsMatch[1]) : null,
    baths: bathsMatch ? Number(bathsMatch[1]) : null,
    budget_min: budget.min,
    budget_max: budget.max,
    neighborhoods,
    must_haves,
    deal_breakers,
    family_context: /kid|kids|family|dog|pet|parent/i.test(freeText) ? freeText.slice(0, 220) : null,
    work_context: /office|downtown|commute|remote|work|bike/i.test(freeText) ? freeText.slice(0, 220) : null,
    timeline_hint: /month|days|summer|fall|spring|winter|lease/i.test(freeText) ? freeText.slice(0, 140) : null,
    financing_hint: /cash|pre.?approved|loan|lender|mortgage/i.test(freeText) ? freeText.slice(0, 140) : null,
    confidence: {
      ...emptyConfidence,
      beds: bedsMatch ? 0.9 : 0,
      baths: bathsMatch ? 0.85 : 0,
      budget_min: budget.min ? 0.85 : 0,
      budget_max: budget.max ? 0.85 : 0,
      neighborhoods: neighborhoods.length ? 0.8 : 0,
      must_haves: must_haves.length ? 0.75 : 0,
      deal_breakers: deal_breakers.length ? 0.75 : 0,
      family_context: /kid|kids|family|dog|pet|parent/i.test(freeText) ? 0.75 : 0,
      work_context: /office|downtown|commute|remote|work|bike/i.test(freeText) ? 0.75 : 0,
      timeline_hint: /month|days|summer|fall|spring|winter|lease/i.test(freeText) ? 0.6 : 0,
      financing_hint: /cash|pre.?approved|loan|lender|mortgage/i.test(freeText) ? 0.6 : 0
    }
  };
}

export async function extractPreferences(input: {
  agent: Agent;
  listings?: Listing[];
  freeText: string;
  answersSoFar: unknown;
}) {
  if (!canUseAnthropic()) return fallbackExtraction(input.agent, input.freeText);

  const prompt = extractionPrompt({
    agent: input.agent,
    agentVoice: agentVoice(input.agent, input.listings),
    freeText: input.freeText,
    answersSoFar: input.answersSoFar
  });

  try {
    return await generateAnthropicObject<FreeTextExtractionResult>(FreeTextExtractionSchema, prompt);
  } catch {
    return fallbackExtraction(input.agent, input.freeText);
  }
}

function answered(answers: IntakeAnswers, question: QuestionId) {
  if (answers.answered_question_ids?.includes(question)) return true;
  const extraction = {
    ...(answers.extraction ?? {}),
    ...(answers.accepted_extraction ?? {})
  };
  if (question === "free_text") return Boolean(answers.free_text_raw || answers.extraction || answers.accepted_extraction);
  if (question === "budget") return answers.budget_min != null || answers.budget_max != null;
  if (question === "bedrooms") return Boolean(answers.bedrooms) || extraction.beds != null;
  if (question === "bathrooms") return Boolean(answers.bathrooms) || extraction.baths != null;
  return Object.prototype.hasOwnProperty.call(answers, question);
}

function extractionConfident(answers: IntakeAnswers, key: keyof FreeTextExtractionResult["confidence"]) {
  return (answers.accepted_extraction?.confidence?.[key] ?? answers.extraction?.confidence?.[key] ?? 0) >= 0.7;
}

export function fallbackNextQuestion(answers: IntakeAnswers): { next_question_id: QuestionId; reason: string } {
  const count = answers.answered_question_ids?.length ?? 0;
  if (!answered(answers, "timeline")) return { next_question_id: "timeline", reason: "Timeline always starts." };
  if (!answered(answers, "free_text")) return { next_question_id: "free_text", reason: "Free text is always second." };
  if (count >= 9) return { next_question_id: "done", reason: "Hard cap reached." };

  const browsing =
    answers.timeline?.preset === "just_exploring" ||
    (answers.financing === "not_started" && answers.financing_help === "no") ||
    answers.tier_hint === "browsing";
  const browsingTrack: QuestionId[] = ["bedrooms", "budget", "neighborhoods"];
  const fullTrack: QuestionId[] = [
    "current_situation",
    "financing",
    answers.financing === "pre_approved" ? "preapproval_upload" : "financing_help",
    "budget",
    "bedrooms",
    "property_type",
    "neighborhoods",
    "must_haves",
    "deal_breakers",
    "first_time_buyer"
  ];
  const track = browsing ? browsingTrack : fullTrack;

  for (const question of track) {
    if (question === "preapproval_upload" && answers.financing !== "pre_approved") continue;
    if (question === "financing_help" && answers.financing !== "not_started") continue;
    if (question === "budget" && (extractionConfident(answers, "budget_min") || extractionConfident(answers, "budget_max"))) continue;
    if (question === "bedrooms" && extractionConfident(answers, "beds")) continue;
    if (question === "bathrooms" && extractionConfident(answers, "baths")) continue;
    if (question === "neighborhoods" && extractionConfident(answers, "neighborhoods")) continue;
    if (question === "must_haves" && extractionConfident(answers, "must_haves")) continue;
    if (question === "deal_breakers" && extractionConfident(answers, "deal_breakers")) continue;
    if (!answered(answers, question)) return { next_question_id: question, reason: `Next missing ${question}.` };
  }

  const hasBudget =
    answered(answers, "budget") ||
    extractionConfident(answers, "budget_min") ||
    extractionConfident(answers, "budget_max");
  const hasBedrooms = answered(answers, "bedrooms") || extractionConfident(answers, "beds");
  const hasNeighborhoods = answered(answers, "neighborhoods") || extractionConfident(answers, "neighborhoods");
  const stillAmbiguous = !hasBudget || !hasBedrooms || !hasNeighborhoods;

  if (stillAmbiguous && !answered(answers, "anything_else") && count < 9) {
    return { next_question_id: "anything_else", reason: "Core preferences are still ambiguous." };
  }

  return { next_question_id: "done", reason: "Enough information to create matches." };
}

export async function chooseNextQuestion(input: { agent: Agent; listings?: Listing[]; answers: IntakeAnswers }) {
  if (!canUseAnthropic()) return fallbackNextQuestion(input.answers);

  const prompt = nextQuestionPrompt({
    agent: input.agent,
    agentVoice: agentVoice(input.agent, input.listings),
    answersSoFar: input.answers,
    answeredQuestionCount: input.answers.answered_question_ids?.length ?? 0
  });

  try {
    return await generateAnthropicObject<{ next_question_id: QuestionId; reason?: string }>(
      IntakeNextQuestionDecisionSchema,
      prompt
    );
  } catch {
    return fallbackNextQuestion(input.answers);
  }
}

type BriefInput = {
  agent: Agent;
  listings: Listing[];
  lead: Lead;
  events: EventRecord[];
};

function fallbackBrief(input: BriefInput) {
  const preferences = input.lead.preferences;
  return {
    one_line_summary: `${input.lead.first_name ?? "Buyer"} looking in ${input.agent.market}`,
    why_serious:
      preferences.financing === "pre_approved" || preferences.financing === "cash_buyer"
        ? ["Financing signal is strong."]
        : [],
    watch_outs: preferences.tier_hint === "browsing" ? ["Buyer is still browsing."] : [],
    suggested_opener: `Hi ${input.lead.first_name ?? "there"}, it is ${input.agent.name}. I pulled a few homes that line up with what you shared, especially ${preferences.neighborhoods?.[0] ?? "your preferred areas"}. Want me to send the strongest one first?`,
    priority: preferences.tier_hint === "browsing" ? "browsing" : "warm"
  };
}

export async function generateBrief(input: BriefInput) {
  if (!canUseAnthropic()) return fallbackBrief(input);

  const prompt = agentBriefPrompt({
    agent: input.agent,
    agentVoice: agentVoice(input.agent, input.listings),
    preferences: input.lead.preferences,
    freeTextRaw: input.lead.free_text_raw,
    events: input.events,
    tierHint: input.lead.tier
  });

  try {
    return await generateAnthropicObject<ReturnType<typeof fallbackBrief>>(AgentBriefSchema, prompt);
  } catch {
    return fallbackBrief(input);
  }
}

type MatchReasonsInput = {
  agent: Agent;
  listings: Listing[];
  preferences: Preferences;
  freeTextRaw?: string | null;
};

function fallbackMatchReasons(input: MatchReasonsInput) {
  return {
    reasons: input.listings.map((listing) => ({
      listing_id: listing.id,
      match_reason: `${listing.neighborhood ?? "This area"} gives you ${listing.beds}BR at ${formatCurrency(listing.price)}, with ${listing.features[0] ?? "a practical layout"} in the mix.`
    }))
  };
}

export async function generateMatchReasons(input: MatchReasonsInput) {
  if (!canUseAnthropic()) return fallbackMatchReasons(input);

  const prompt = matchReasonsPrompt({
    agent: input.agent,
    agentVoice: agentVoice(input.agent, input.listings),
    preferences: input.preferences,
    freeTextRaw: input.freeTextRaw,
    listings: input.listings
  });

  try {
    return await generateAnthropicObject<ReturnType<typeof fallbackMatchReasons>>(
      PerListingMatchReasonsSchema,
      prompt
    );
  } catch {
    return fallbackMatchReasons(input);
  }
}

type WhatsNewInput = {
  agent: Agent;
  listings: Listing[];
  lead: Lead;
  events: EventRecord[];
};

function fallbackWhatsNew(input: WhatsNewInput, pocketListings: Listing[]) {
  const neighborhood = input.lead.preferences.neighborhoods?.[0] ?? input.lead.preferences.extraction?.neighborhoods?.[0];
  return {
    summary: neighborhood
      ? `${input.agent.name} has your ${neighborhood} matches ready, including ${pocketListings.length ? "a private option" : "the latest fit"}.`
      : "Welcome back — your matches are ready when you are."
  };
}

export async function generateWhatsNew(input: WhatsNewInput) {
  const newListings = input.listings.filter((listing) => (listing.created_at ?? "") > input.lead.created_at);
  const pocketListings = input.listings.filter((listing) => listing.is_pocket);

  if (!canUseAnthropic()) return fallbackWhatsNew(input, pocketListings);

  const prompt = whatsNewPrompt({
    agent: input.agent,
    agentVoice: agentVoice(input.agent, input.listings),
    lead: input.lead,
    newListings,
    pocketListings,
    visitHistory: input.events
  });

  try {
    return await generateAnthropicObject<ReturnType<typeof fallbackWhatsNew>>(WhatsNewResponseSchema, prompt);
  } catch {
    return fallbackWhatsNew(input, pocketListings);
  }
}
