import type { FreeTextExtractionResult, IntakeAnswers, QuestionId } from "@/lib/ai/schemas";
import {
  categoryFromPropertyTypes,
  hasMultifamilyPropertyTypes,
  hasSingleFamilyPropertyTypes,
  propertyCategoryIncludesMultifamily,
  propertyCategoryIncludesSingleFamily
} from "@/lib/intake/property-preferences";

export function questionAnswered(answers: IntakeAnswers, question: QuestionId) {
  const extraction = answers.accepted_extraction ?? answers.extraction ?? {};
  if (answers.answered_question_ids?.includes(question)) return true;
  if (question === "free_text") return Boolean(answers.free_text_raw || answers.extraction || answers.accepted_extraction);
  if (question === "budget") return answers.budget_min != null || answers.budget_max != null;
  if (question === "bedrooms") return Boolean(answers.bedrooms) || extraction.beds != null;
  if (question === "bathrooms") return Boolean(answers.bathrooms) || extraction.baths != null;
  if (question === "property_category") return Boolean(answers.property_category ?? categoryFromPropertyTypes(answers.property_type));
  if (question === "single_family_property_type") {
    return Boolean(answers.single_family_property_type?.length || hasSingleFamilyPropertyTypes(answers.property_type));
  }
  if (question === "multifamily_property_type") {
    return Boolean(answers.multifamily_property_type?.length || hasMultifamilyPropertyTypes(answers.property_type));
  }
  return Object.prototype.hasOwnProperty.call(answers, question);
}

function extractionConfident(answers: IntakeAnswers, key: keyof FreeTextExtractionResult["confidence"]) {
  return (answers.accepted_extraction?.confidence?.[key] ?? answers.extraction?.confidence?.[key] ?? 0) >= 0.7;
}

export function fallbackNextQuestion(answers: IntakeAnswers): { next_question_id: QuestionId; reason: string } {
  const count = answers.answered_question_ids?.length ?? 0;
  if (!questionAnswered(answers, "timeline")) return { next_question_id: "timeline", reason: "Timeline always starts." };
  if (!questionAnswered(answers, "free_text")) return { next_question_id: "free_text", reason: "Free text is always second." };
  const browsing = isBrowsingTrack(answers);
  const pendingPropertyQuestion = browsing ? undefined : nextPendingPropertyQuestion(answers);
  if (count >= 9 && pendingPropertyQuestion) {
    return {
      next_question_id: pendingPropertyQuestion,
      reason: "Property branch detail is still pending."
    };
  }
  if (count >= 9) return { next_question_id: "done", reason: "Hard cap reached." };

  const browsingTrack: QuestionId[] = ["bedrooms", "budget", "neighborhoods"];
  const fullTrack: QuestionId[] = [
    "current_situation",
    "financing",
    answers.financing === "pre_approved" ? "preapproval_upload" : "financing_help",
    "budget",
    "bedrooms",
    ...propertyPreferenceTrack(answers),
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
    if (!questionAnswered(answers, question)) return { next_question_id: question, reason: `Next missing ${question}.` };
  }

  const hasBudget =
    questionAnswered(answers, "budget") ||
    extractionConfident(answers, "budget_min") ||
    extractionConfident(answers, "budget_max");
  const hasBedrooms = questionAnswered(answers, "bedrooms") || extractionConfident(answers, "beds");
  const hasNeighborhoods = questionAnswered(answers, "neighborhoods") || extractionConfident(answers, "neighborhoods");
  const stillAmbiguous = !hasBudget || !hasBedrooms || !hasNeighborhoods;

  if (stillAmbiguous && !questionAnswered(answers, "anything_else") && count < 9) {
    return { next_question_id: "anything_else", reason: "Core preferences are still ambiguous." };
  }

  return { next_question_id: "done", reason: "Enough information to create matches." };
}

export function safeNextQuestionDecision(
  answers: IntakeAnswers,
  decision: { next_question_id: QuestionId; reason?: string }
) {
  if (decision.next_question_id === "done") {
    const fallback = fallbackNextQuestion(answers);
    if (isPropertyPreferenceQuestion(fallback.next_question_id)) return fallback;
    return decision;
  }
  if (!questionAllowedForAnswers(answers, decision.next_question_id)) {
    return fallbackNextQuestion(answers);
  }
  if (questionAnswered(answers, decision.next_question_id)) {
    return fallbackNextQuestion(answers);
  }
  return decision;
}

function propertyPreferenceTrack(answers: IntakeAnswers): QuestionId[] {
  const category = answers.property_category ?? categoryFromPropertyTypes(answers.property_type);
  if (!category) return ["property_category"];

  const questions: QuestionId[] = [];
  if (propertyCategoryIncludesSingleFamily(category)) questions.push("single_family_property_type");
  if (propertyCategoryIncludesMultifamily(category)) questions.push("multifamily_property_type");
  return questions;
}

function nextPendingPropertyQuestion(answers: IntakeAnswers) {
  return propertyPreferenceTrack(answers).find((question) => !questionAnswered(answers, question));
}

function isPropertyPreferenceQuestion(question: QuestionId) {
  return (
    question === "property_category" ||
    question === "single_family_property_type" ||
    question === "multifamily_property_type"
  );
}

function isBrowsingTrack(answers: IntakeAnswers) {
  return (
    answers.timeline?.preset === "just_exploring" ||
    (answers.financing === "not_started" && answers.financing_help === "no") ||
    answers.tier_hint === "browsing"
  );
}

function questionAllowedForAnswers(answers: IntakeAnswers, question: QuestionId) {
  if (question === "property_type") return false;
  if (question === "single_family_property_type") {
    const category = answers.property_category ?? categoryFromPropertyTypes(answers.property_type);
    return propertyCategoryIncludesSingleFamily(category);
  }
  if (question === "multifamily_property_type") {
    const category = answers.property_category ?? categoryFromPropertyTypes(answers.property_type);
    return propertyCategoryIncludesMultifamily(category);
  }
  return true;
}
