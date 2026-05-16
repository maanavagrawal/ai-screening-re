"use client";

import { AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BuyerViewport } from "@/components/shell/buyer-viewport";
import { ProgressDots } from "@/components/shell/progress-dots";
import { ExtractionReview } from "@/components/intake/extraction-review";
import { BudgetQuestion } from "@/components/intake/questions/budget-question";
import {
  CurrentSituationQuestion,
  FinancingHelpQuestion,
  FinancingQuestion,
  LocationQuestion,
  MultiSelectQuestion,
  SegmentedQuestion
} from "@/components/intake/questions/choice-questions";
import { FreeTextQuestion } from "@/components/intake/questions/free-text-question";
import { PreapprovalUploadQuestion } from "@/components/intake/questions/preapproval-upload-question";
import { TimelineQuestion } from "@/components/intake/questions/timeline-question";
import { AnythingElseQuestion } from "@/components/intake/questions/anything-else-question";
import type { FreeTextExtractionResult, IntakeAnswers, QuestionId } from "@/lib/ai/schemas";
import { fallbackNextQuestion } from "@/lib/intake/next-question";
import type { Agent } from "@/lib/types";
import { useSessionId } from "@/hooks/use-session-id";
import { useTrackEvent } from "@/hooks/use-track-event";

const mustHaveOptions = [
  "yard",
  "garage",
  "pool",
  "home_office",
  "updated_kitchen",
  "open_floor_plan",
  "walkable",
  "quiet_street",
  "new_construction"
].map((value) => ({ value, label: value.replaceAll("_", " ") }));

const dealBreakerOptions = ["hoa", "fixer_upper", "busy_street", "long_commute", "shared_walls"].map((value) => ({
  value,
  label: value.replaceAll("_", " ")
}));

export function IntakeFlow({ agent }: { agent: Agent }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = useSessionId();
  const track = useTrackEvent(agent.slug);
  const storageKey = useMemo(() => (sessionId ? `intake:${agent.slug}:${sessionId}` : ""), [agent.slug, sessionId]);
  const [answers, setAnswers] = useState<IntakeAnswers>({ answered_question_ids: [] });
  const [question, setQuestion] = useState<QuestionId>("timeline");
  const [extracting, setExtracting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const advancingRef = useRef(false);
  const [reviewExtraction, setReviewExtraction] = useState<FreeTextExtractionResult | null>(null);
  const [reviewFreeText, setReviewFreeText] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId || !storageKey) return;
    if (searchParams.get("start_over")) {
      window.localStorage.removeItem(storageKey);
      track("intake_started", { start_over: true });
      return;
    }
    const existing = window.localStorage.getItem(storageKey);
    if (existing) {
      try {
        const parsed = JSON.parse(existing) as { answers?: IntakeAnswers; question?: QuestionId };
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.question) setQuestion(parsed.question);
      } catch {
        window.localStorage.removeItem(storageKey);
        track("intake_started");
      }
    } else {
      track("intake_started");
    }
  }, [searchParams, sessionId, storageKey, track]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ answers, question }));
  }, [answers, question, storageKey]);

  async function advance(questionId: QuestionId, value: unknown, patch: Partial<IntakeAnswers> = {}) {
    if (advancingRef.current) return false;
    advancingRef.current = true;
    setAdvancing(true);
    setError("");
    const nextAnswers: IntakeAnswers = {
      ...answers,
      ...patch,
      answered_question_ids: Array.from(new Set([...(answers.answered_question_ids ?? []), questionId]))
    };

    if (questionId === "timeline" && typeof value === "object" && value && "preset" in value) {
      nextAnswers.timeline = value as IntakeAnswers["timeline"];
      if ((value as { preset?: string }).preset === "just_exploring") nextAnswers.tier_hint = "browsing";
    }
    if (questionId === "current_situation") nextAnswers.current_situation = value as IntakeAnswers["current_situation"];
    if (questionId === "financing") nextAnswers.financing = value as IntakeAnswers["financing"];
    if (questionId === "financing_help") {
      nextAnswers.financing_help = value as IntakeAnswers["financing_help"];
      if (value === "no") nextAnswers.tier_hint = "browsing";
    }
    if (questionId === "budget") {
      const budget = value as { min: number; max?: number };
      nextAnswers.budget_min = budget.min;
      nextAnswers.budget_max = budget.max;
    }
    if (questionId === "bedrooms") nextAnswers.bedrooms = value as IntakeAnswers["bedrooms"];
    if (questionId === "bathrooms") nextAnswers.bathrooms = value as IntakeAnswers["bathrooms"];
    if (questionId === "property_type") nextAnswers.property_type = value as NonNullable<IntakeAnswers["property_type"]>;
    if (questionId === "neighborhoods") {
      const locationAnswer = value as {
        neighborhoods?: string[];
        selected_areas?: IntakeAnswers["selected_areas"];
        open_to_suggestions?: boolean;
      };
      nextAnswers.neighborhoods = locationAnswer.neighborhoods ?? (Array.isArray(value) ? (value as string[]) : []);
      nextAnswers.selected_areas = locationAnswer.selected_areas ?? [];
      nextAnswers.open_to_suggestions = Boolean(locationAnswer.open_to_suggestions);
    }
    if (questionId === "must_haves") nextAnswers.must_haves = value as NonNullable<IntakeAnswers["must_haves"]>;
    if (questionId === "deal_breakers") nextAnswers.deal_breakers = value as NonNullable<IntakeAnswers["deal_breakers"]>;
    if (questionId === "first_time_buyer") nextAnswers.first_time_buyer = value === "yes";
    if (questionId === "anything_else") nextAnswers.anything_else = value as string;
    if (questionId === "preapproval_upload" && value) nextAnswers.preapproval_url = value as string;

    setAnswers(nextAnswers);
    track("intake_question_answered", answerMetadata(questionId, value));

    try {
      const decision = fallbackNextQuestion(nextAnswers);
      if (decision.next_question_id === "done") {
        track("intake_completed");
        router.push(`/${agent.slug}/gate`);
      } else {
        setQuestion(decision.next_question_id);
      }
      return true;
    } catch {
      setError("We could not save that answer. Please try again.");
      return false;
    } finally {
      advancingRef.current = false;
      setAdvancing(false);
    }
  }

  async function submitFreeText(value: string) {
    setError("");
    setExtracting(true);
    track("intake_free_text_submitted", { length_chars: value.length });
    try {
      const response = await fetch("/api/intake/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_slug: agent.slug, free_text: value, answers })
      });
      if (!response.ok) throw new Error("Unable to read intake notes.");
      const data = (await response.json()) as { extraction: FreeTextExtractionResult };
      if (!data.extraction) throw new Error("Intake extraction was missing.");
      setAnswers((current) => ({ ...current, free_text_raw: value, extraction: data.extraction }));
      setReviewFreeText(value);
      setReviewExtraction(data.extraction);
    } catch {
      setError("We could not read those notes. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  async function acceptExtraction(extraction: FreeTextExtractionResult) {
    const rawText = reviewFreeText ?? answers.free_text_raw ?? "";
    const accepted = await advance("free_text", rawText, {
      free_text_raw: rawText,
      extraction: answers.extraction ?? extraction,
      accepted_extraction: extraction
    });
    if (accepted) {
      setReviewExtraction(null);
      setReviewFreeText(null);
    }
  }

  return (
    <BuyerViewport>
      <div className="sticky top-0 z-10 bg-[#FAFAF7]/85 py-5 backdrop-blur">
        <ProgressDots active={Math.min((answers.answered_question_ids?.length ?? 0) % 6, 5)} />
      </div>
      {error ? (
        <p role="alert" className="rounded-2xl border border-warm-border bg-white/80 p-3 text-sm text-warm-text">
          {error}
        </p>
      ) : null}
      <AnimatePresence mode="wait">
        <div key={reviewExtraction ? "review" : question}>
          {reviewExtraction ? (
            <ExtractionReview
              extraction={reviewExtraction}
              disabled={advancing}
              onAccept={(extraction) => void acceptExtraction(extraction)}
              onEdited={() => track("intake_extraction_edited")}
            />
          ) : question === "timeline" ? (
            <TimelineQuestion disabled={advancing} onAnswer={(value) => void advance("timeline", value)} />
          ) : question === "free_text" ? (
            <FreeTextQuestion loading={extracting} onSubmit={submitFreeText} />
          ) : question === "current_situation" ? (
            <CurrentSituationQuestion disabled={advancing} onAnswer={(value) => void advance("current_situation", value)} />
          ) : question === "financing" ? (
            <FinancingQuestion disabled={advancing} onAnswer={(value) => void advance("financing", value)} />
          ) : question === "preapproval_upload" ? (
            <PreapprovalUploadQuestion
              agentSlug={agent.slug}
              sessionId={sessionId}
              disabled={advancing}
              onAnswer={(value) => void advance("preapproval_upload", value)}
            />
          ) : question === "financing_help" ? (
            <FinancingHelpQuestion disabled={advancing} onAnswer={(value) => void advance("financing_help", value)} />
          ) : question === "budget" ? (
            <BudgetQuestion disabled={advancing} onAnswer={(value) => void advance("budget", value)} />
          ) : question === "bedrooms" ? (
            <SegmentedQuestion disabled={advancing} title="How many bedrooms?" options={["1", "2", "3", "4", "5_plus"]} onAnswer={(value) => void advance("bedrooms", value)} />
          ) : question === "bathrooms" ? (
            <SegmentedQuestion disabled={advancing} title="How many bathrooms?" options={["1", "2", "3", "4_plus"]} onAnswer={(value) => void advance("bathrooms", value)} />
          ) : question === "property_type" ? (
            <MultiSelectQuestion
              disabled={advancing}
              title="What kind of home?"
              options={[
                { label: "House", value: "house" },
                { label: "Condo", value: "condo" },
                { label: "Townhouse", value: "townhouse" },
                { label: "Multi-family", value: "multi_family" }
              ]}
              onAnswer={(value) => void advance("property_type", value)}
            />
          ) : question === "neighborhoods" ? (
            <LocationQuestion
              agentSlug={agent.slug}
              disabled={advancing}
              initialOptions={agent.neighborhoods}
              initial={answers.selected_areas}
              onAnswer={(value) => void advance("neighborhoods", value)}
            />
          ) : question === "must_haves" ? (
            <MultiSelectQuestion disabled={advancing} title="What would make it feel right?" options={mustHaveOptions} initial={answers.accepted_extraction?.must_haves} onAnswer={(value) => void advance("must_haves", value)} />
          ) : question === "deal_breakers" ? (
            <MultiSelectQuestion disabled={advancing} title="Anything you want to avoid?" options={dealBreakerOptions} onAnswer={(value) => void advance("deal_breakers", value)} />
          ) : question === "first_time_buyer" ? (
            <SegmentedQuestion disabled={advancing} title="First time buying?" options={["yes", "no"]} onAnswer={(value) => void advance("first_time_buyer", value)} />
          ) : (
            <AnythingElseQuestion disabled={advancing} onAnswer={(value) => void advance("anything_else", value)} />
          )}
        </div>
      </AnimatePresence>
    </BuyerViewport>
  );
}

function answerMetadata(questionId: QuestionId, value: unknown) {
  return {
    q_id: questionId,
    answer_kind: Array.isArray(value) ? "array" : value === null || value === undefined || value === "" ? "empty" : typeof value,
    ...(Array.isArray(value) ? { selected_count: value.length } : {}),
    has_value: Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== ""
  };
}
