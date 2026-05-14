import type { Agent, EventRecord, Listing, Lead, Preferences } from "@/lib/types";
import { buyerSafeListingSummary, redactKnownListingAddresses } from "@/lib/listing-privacy";

export function agentVoice(agent: Agent, listings: Listing[] = []) {
  const notes = listings
    .map((listing) => listing.agent_note)
    .filter((note): note is string => Boolean(note))
    .map((note) => redactKnownListingAddresses(note, listings))
    .slice(0, 3)
    .join(" ");

  return [
    `${agent.name} works in ${agent.market}.`,
    agent.voice_notes ? `Agent voice notes: ${agent.voice_notes}` : "",
    agent.bio ? `Bio: ${agent.bio}` : "",
    notes ? `Examples of the agent's actual listing voice: ${notes}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function voiceGenerationPrompt(input: { rawText: string; market: string }) {
  return {
    system: `You help a real estate agent turn rough personal notes into landing page copy and reusable voice guidance.

The output should sound specific, local, and human. Avoid corporate phrases like "trusted advisor", "dream home", "white-glove", "seamless", or "AI-powered".

Return only the schema:
- bio: one line, 12-20 words.
- headline: buyer-facing landing headline, short enough for a phone screen.
- sub_headline: 5-10 words, plain and confident.
- voice_notes: 2-3 sentences describing how this agent talks, for future lead briefs and listing match reasons.

Few-shot:
Input: "I grew up in Ballard, I care about commute math, and I tell buyers when a house is not worth it."
Output style: bio = "Ballard-raised Seattle advisor who is blunt about commute, resale, and tradeoffs."
voice_notes = "Direct, practical, locally specific. Uses plain language, calls out tradeoffs, and avoids hype."

Input: "I work with first-time buyers in East Austin and explain renovation upside without pressure."
Output style: bio = "East Austin buyer specialist who makes renovation upside feel clear, calm, and doable."
voice_notes = "Warm, specific, and steady. Names neighborhoods, renovation ranges, and buyer concerns without sounding salesy."`,
    prompt: `Market:
${input.market}

Agent notes:
${input.rawText}`
  };
}

export function replyTemplatesPrompt(input: {
  agent: Agent;
  agentVoice: string;
  listings: Listing[];
  baseUrl: string;
}) {
  return {
    system: `You write short copy/paste reply templates for ${input.agent.name}, a real estate agent.

Agent voice/context:
${input.agentVoice}

Rules:
- Return templates for Instagram DM reply, missed call follow-up, open house follow-up, and Zillow lead reply.
- Each template is 2-3 sentences.
- Sound like the agent wrote it quickly for a real person.
- End with a screening link.
- No corporate boilerplate, no emojis, no claims not supported by the input.`,
    prompt: `Agent:
${input.agent.name}

Recent listings:
${JSON.stringify(input.listings.slice(0, 5), null, 2)}

Base tracked link:
${input.baseUrl}`
  };
}

export function regenerateOpenerPrompt(input: {
  agent: Agent;
  agentVoice: string;
  lead: Lead;
  events: EventRecord[];
  toneHint?: "shorter" | "warmer" | "more_direct" | null;
}) {
  return {
    system: `You rewrite one suggested opener for ${input.agent.name} to text a real estate buyer.

Agent voice/context:
${input.agentVoice}

Rules:
- Output one text message only, 1-3 short sentences.
- Reference at least one specific buyer detail.
- Never mention AI, scoring, tracking, or internal notes.
- If toneHint is shorter, make it tighter.
- If toneHint is warmer, add warmth without fluff.
- If toneHint is more_direct, be concise and action-oriented.`,
    prompt: `Lead:
${JSON.stringify(input.lead, null, 2)}

Events:
${JSON.stringify(input.events, null, 2)}

Tone hint:
${input.toneHint ?? "default"}`
  };
}

export function extractionPrompt(input: {
  agent: Agent;
  agentVoice: string;
  freeText: string;
  answersSoFar: unknown;
}) {
  return {
    system: `You extract real estate buyer preferences from casual buyer text for ${input.agent.name}, a real estate agent in ${input.agent.market}.

Agent voice/context:
${input.agentVoice}

Canonical neighborhoods for this agent:
${input.agent.neighborhoods.join(", ")}

Your job is to return structured preferences only when they are clearly stated or strongly implied. Nulls are better than guesses. Do not invent neighborhoods, prices, financing status, family details, or work details.

Neighborhood rules:
- Match neighborhood mentions only to the canonical list above.
- If the buyer describes an area without naming a canonical neighborhood, leave neighborhoods empty unless the match is obvious.
- Preserve useful location nuance in family_context or work_context only if it matters to the agent.

Budget rules:
- Convert shorthand like "$750k", "750", "1.2M", or "under a million" into integer USD values when clear.
- If the buyer gives only a ceiling, set budget_max and leave budget_min null.
- If the buyer gives a range, set both budget_min and budget_max.
- If budget is vague, leave both null.

Preference rules:
- Extract beds and baths only if specific.
- Map needs to must_haves using the allowed enum.
- Map objections to deal_breakers using the allowed enum.
- family_context should preserve human context that affects the search, such as kids, pets, parents, schools, lifestyle, or relocation.
- work_context should preserve commute, remote work, office, travel, or schedule details.
- timeline_hint and financing_hint are natural-language hints, not normalized enums.
- Confidence values are per field from 0 to 1. Use 0.7+ only when the field is safe enough for the intake flow to skip asking a follow-up question.

Return only data matching the provided schema.`,
    prompt: `Buyer text:
${input.freeText}

Already-known intake answers, if any:
${JSON.stringify(input.answersSoFar, null, 2)}`
  };
}

export function nextQuestionPrompt(input: {
  agent: Agent;
  agentVoice: string;
  answersSoFar: unknown;
  answeredQuestionCount: number;
}) {
  return {
    system: `You choose the next intake question for a buyer using ${input.agent.name}'s real estate page.

Agent voice/context:
${input.agentVoice}

You are not writing buyer-facing copy. You are deciding the next question ID only.

The flow should feel fast, thoughtful, and non-repetitive. The target is 5-7 total questions with a hard cap of 9. Skip questions already answered with reasonable confidence.

Question IDs:
timeline, free_text, current_situation, financing, preapproval_upload, financing_help, budget, bedrooms, bathrooms, property_type, neighborhoods, must_haves, deal_breakers, first_time_buyer, anything_else, done

Rules:
1. Always ask timeline first if it has not been answered.
2. Always ask free_text second if it has not been answered.
3. After free_text, use extracted confidence to skip structured questions where confidence >= 0.7.
4. Do not ask budget if budget_min or budget_max is already clear enough from extraction or direct answers.
5. Do not ask bedrooms if beds is already clear enough.
6. Do not ask bathrooms if baths is already clear enough.
7. Ask financing before preapproval_upload or financing_help.
8. If financing is pre_approved, ask preapproval_upload unless already answered or skipped.
9. If financing is not_started, ask financing_help unless already answered.
10. If timeline is just_exploring, use the unserious track.
11. If financing is not_started and financing_help is no, use the unserious track.
12. Unserious track means ask only missing beds, budget, neighborhoods, then done. Tagging happens outside this response.
13. End with anything_else before done if there is meaningful ambiguity and the hard cap has not been reached.
14. Return done once enough information exists to create useful matches.
15. Never exceed 9 answered intake questions. If the hard cap is reached, return done.

Return next_question_id and an internal reason. The reason is for logs only and is never shown to the buyer.`,
    prompt: `Agent:
${input.agent.name}
Market:
${input.agent.market}

Answers so far:
${JSON.stringify(input.answersSoFar, null, 2)}

Answered question count:
${input.answeredQuestionCount}`
  };
}

export function agentBriefPrompt(input: {
  agent: Agent;
  agentVoice: string;
  preferences: Preferences;
  freeTextRaw?: string | null;
  events: EventRecord[];
  tierHint?: string | null;
}) {
  return {
    system: `You write concise lead briefings for ${input.agent.name}, a real estate agent who is about to text this buyer within 15 minutes.

Agent voice/context:
${input.agentVoice}

Write like a sharp assistant briefing their boss: specific, scannable, calm, and useful. No hype. No generic sales language.

Use only the provided input. Never invent facts. If something is vague, call it out as vague.

Priority rules:
- priority = "browsing" if intake explicitly flagged the buyer as browsing or unserious.
- priority = "hot" requires at least one strong signal: verified/pre-approved/cash financing, a specific near-term timeline, a showing request, repeated listing engagement, or unusually specific search intent.
- priority = "warm" is for captured leads with useful preferences but without hot-level urgency.
- Do not mark someone hot just because they completed the form.

Suggested opener rules:
- Write a text ${input.agent.name} could literally send.
- Use ${input.agent.name}'s voice.
- Reference at least one specific buyer detail.
- Keep it to 2-3 short sentences.
- Do not mention internal scoring, AI, extraction, lead tier, or behavioral tracking.

Output must match the provided schema:
one_line_summary under 120 characters,
why_serious max 4 bullets,
watch_outs max 3 bullets,
suggested_opener,
priority.`,
    prompt: `Agent:
${input.agent.name}
Market:
${input.agent.market}

Lead preferences:
${JSON.stringify(input.preferences, null, 2)}

Raw free-text, if present:
${input.freeTextRaw ?? ""}

Behavioral events so far:
${JSON.stringify(input.events, null, 2)}

Lead tier hint:
${input.tierHint ?? ""}`
  };
}

export function whatsNewPrompt(input: {
  agent: Agent;
  agentVoice: string;
  lead: Lead;
  newListings: Listing[];
  pocketListings: Listing[];
  visitHistory: EventRecord[];
}) {
  return {
    system: `You write one warm sentence for a returning buyer on ${input.agent.name}'s real estate page.

Agent voice/context:
${input.agentVoice}

The sentence should feel personal and useful, not automated. No markdown. No exclamation marks. One sentence only.

Reference specifics from the buyer's preferences when possible, such as neighborhood, budget, bedrooms, must-haves, or pocket listings. If there is no meaningful update, use the fallback exactly:
"Welcome back — your matches are ready when you are."

Few-shot examples:
- Since you were here, ${input.agent.name} added 2 new listings in East Austin under $700k.
- The Tarrytown pocket place is still available, and there's a new 3BR in Mueller you haven't seen.
- ${input.agent.name} hasn't added new listings in your range this week, but two you viewed before are still on market.`,
    prompt: `Agent:
${input.agent.name}

Lead preferences:
${JSON.stringify(input.lead.preferences, null, 2)}

Listings added since lead creation:
${JSON.stringify(input.newListings.map(buyerSafeListingSummary), null, 2)}

Pocket listings still available:
${JSON.stringify(input.pocketListings.map(buyerSafeListingSummary), null, 2)}

Visit history:
${JSON.stringify(input.visitHistory, null, 2)}

Lead created at:
${input.lead.created_at}`
  };
}

export function matchReasonsPrompt(input: {
  agent: Agent;
  agentVoice: string;
  preferences: Preferences;
  freeTextRaw?: string | null;
  listings: Listing[];
}) {
  return {
    system: `You write one specific sentence per listing explaining why it matches this buyer, in ${input.agent.name}'s voice.

Agent voice/context:
${input.agentVoice}

Rules:
- One sentence per listing.
- Under 25 words per sentence.
- Reference at least one specific buyer preference and one specific listing attribute.
- Sound conversational, like the agent texting a friend.
- Never invent listing details.
- Never mention the street number, street name, or exact address; buyers receive exact addresses only after they request a showing.
- Avoid generic phrases like "great match", "perfect for you", "checks all the boxes", or "dream home".
- If there is a drawback relevant to the buyer, mention it plainly.
- Do not mention AI, scoring, ranking, or internal logic.
- Return one object for each listing_id provided, no extras.

Few-shot examples:
Buyer wants WFH setup near downtown. Listing has north-facing office and is in Cherrywood.
Output: "Office faces north for your WFH setup, and Cherrywood is a 12-min bike to downtown."

Buyer wants yard for dog and updated kitchen under $750k. Listing has fenced yard, updated kitchen, price $690k.
Output: "Updated kitchen, fenced yard for the dog, and well under your $750k ceiling."

Buyer wants walkability but dislikes busy streets. Listing is near South Congress and flagged busy_street.
Output: "Walkable to South Congress like you wanted, but watch the busy street on the east side."`,
    prompt: `Agent:
${input.agent.name}
Market:
${input.agent.market}

Buyer preferences:
${JSON.stringify(input.preferences, null, 2)}

Raw free-text context, if present:
${input.freeTextRaw ?? ""}

Top listings:
${JSON.stringify(input.listings.map(buyerSafeListingSummary), null, 2)}`
  };
}
