import { describe, expect, it } from "vitest";
import { fallbackExtraction } from "@/lib/ai/anthropic";
import { fallbackNextQuestion, safeNextQuestionDecision } from "@/lib/intake/next-question";
import type { Agent } from "@/lib/types";

const agent: Agent = {
  id: "agent-1",
  slug: "maya",
  name: "Maya Chen",
  headshot_url: null,
  bio: null,
  market: "Austin, TX",
  neighborhoods: ["East Austin", "Mueller"],
  phone: null,
  email: null,
  closed_volume_usd: 0,
  buyers_placed: 0,
  accent_color: null
};

describe("AI fallbacks", () => {
  it("extracts a budget range without collapsing it to the lower number", () => {
    const extraction = fallbackExtraction(
      agent,
      "We need a 3 bed near East Austin with a yard, ideally $650-750k."
    );

    expect(extraction.budget_min).toBe(650000);
    expect(extraction.budget_max).toBe(750000);
    expect(extraction.neighborhoods).toEqual(["East Austin"]);
    expect(extraction.must_haves).toContain("yard");
  });

  it("treats free_text_raw as enough to avoid asking free text again", () => {
    const decision = fallbackNextQuestion({
      answered_question_ids: ["timeline"],
      timeline: { preset: "60_days" },
      free_text_raw: "Looking near Mueller."
    });

    expect(decision.next_question_id).toBe("current_situation");
  });

  it("guards an AI decision that tries to repeat an answered free-text question", () => {
    const decision = safeNextQuestionDecision(
      {
        answered_question_ids: ["timeline", "free_text"],
        timeline: { preset: "60_days" },
        free_text_raw: "Looking near Mueller."
      },
      { next_question_id: "free_text", reason: "Bad repeated model choice." }
    );

    expect(decision.next_question_id).toBe("current_situation");
  });

  it("does not ask anything_else when core preferences are already clear", () => {
    const decision = fallbackNextQuestion({
      answered_question_ids: [
        "timeline",
        "free_text",
        "current_situation",
        "financing",
        "preapproval_upload",
        "property_category",
        "single_family_property_type",
        "first_time_buyer"
      ],
      timeline: { preset: "30_days" },
      financing: "pre_approved",
      bedrooms: "3",
      bathrooms: "2",
      property_category: "single_family",
      single_family_property_type: ["house"],
      property_type: ["house"],
      accepted_extraction: {
        beds: 3,
        baths: null,
        budget_min: null,
        budget_max: 750000,
        neighborhoods: ["East Austin"],
        must_haves: ["yard"],
        deal_breakers: ["busy_street"],
        family_context: null,
        work_context: null,
        timeline_hint: null,
        financing_hint: null,
        confidence: {
          beds: 0.9,
          baths: 0,
          budget_min: 0,
          budget_max: 0.85,
          neighborhoods: 0.8,
          must_haves: 0.75,
          deal_breakers: 0.75,
          family_context: 0,
          work_context: 0,
          timeline_hint: 0,
          financing_hint: 0
        }
      }
    });

    expect(decision.next_question_id).toBe("done");
  });

  it("asks property category before property detail questions", () => {
    const decision = fallbackNextQuestion({
      answered_question_ids: ["timeline", "free_text", "current_situation", "financing", "budget", "bedrooms"],
      timeline: { preset: "30_days" },
      free_text_raw: "Still comparing property options.",
      current_situation: { status: "renting" },
      financing: "cash_buyer",
      budget_min: 500000,
      budget_max: 900000,
      bedrooms: "3"
    });

    expect(decision.next_question_id).toBe("property_category");
  });

  it("routes single-family buyers only to single-family property types", () => {
    const singleDetail = fallbackNextQuestion({
      answered_question_ids: [
        "timeline",
        "free_text",
        "current_situation",
        "financing",
        "budget",
        "bedrooms",
        "property_category"
      ],
      timeline: { preset: "30_days" },
      free_text_raw: "Looking for a home.",
      current_situation: { status: "renting" },
      financing: "cash_buyer",
      budget_min: 500000,
      budget_max: 900000,
      bedrooms: "3",
      property_category: "single_family"
    });

    const afterSingleDetail = fallbackNextQuestion({
      answered_question_ids: [
        "timeline",
        "free_text",
        "current_situation",
        "financing",
        "budget",
        "bedrooms",
        "property_category",
        "single_family_property_type"
      ],
      timeline: { preset: "30_days" },
      free_text_raw: "Looking for a home.",
      current_situation: { status: "renting" },
      financing: "cash_buyer",
      budget_min: 500000,
      budget_max: 900000,
      bedrooms: "3",
      property_category: "single_family",
      single_family_property_type: ["house"],
      property_type: ["house"]
    });

    expect(singleDetail.next_question_id).toBe("single_family_property_type");
    expect(afterSingleDetail.next_question_id).toBe("neighborhoods");
  });

  it("routes multifamily and both buyers through the right property detail paths", () => {
    const multifamilyDetail = fallbackNextQuestion({
      answered_question_ids: [
        "timeline",
        "free_text",
        "current_situation",
        "financing",
        "budget",
        "bedrooms",
        "property_category"
      ],
      timeline: { preset: "30_days" },
      free_text_raw: "Looking for a small investment property.",
      current_situation: { status: "renting" },
      financing: "cash_buyer",
      budget_min: 500000,
      budget_max: 900000,
      bedrooms: "3",
      property_category: "multi_family"
    });

    const bothFirstDetail = fallbackNextQuestion({
      answered_question_ids: [
        "timeline",
        "free_text",
        "current_situation",
        "financing",
        "budget",
        "bedrooms",
        "property_category"
      ],
      timeline: { preset: "30_days" },
      free_text_raw: "Open to either path.",
      current_situation: { status: "renting" },
      financing: "cash_buyer",
      budget_min: 500000,
      budget_max: 900000,
      bedrooms: "3",
      property_category: "both"
    });

    const bothSecondDetail = fallbackNextQuestion({
      answered_question_ids: [
        "timeline",
        "free_text",
        "current_situation",
        "financing",
        "budget",
        "bedrooms",
        "property_category",
        "single_family_property_type"
      ],
      timeline: { preset: "30_days" },
      free_text_raw: "Open to either path.",
      current_situation: { status: "renting" },
      financing: "cash_buyer",
      budget_min: 500000,
      budget_max: 900000,
      bedrooms: "3",
      property_category: "both",
      single_family_property_type: ["townhouse"],
      property_type: ["townhouse"]
    });

    expect(multifamilyDetail.next_question_id).toBe("multifamily_property_type");
    expect(bothFirstDetail.next_question_id).toBe("single_family_property_type");
    expect(bothSecondDetail.next_question_id).toBe("multifamily_property_type");
  });

  it("finishes the both-path property branch before applying the hard cap", () => {
    const decision = fallbackNextQuestion({
      answered_question_ids: [
        "timeline",
        "free_text",
        "current_situation",
        "financing",
        "preapproval_upload",
        "budget",
        "bedrooms",
        "property_category",
        "single_family_property_type"
      ],
      timeline: { preset: "30_days" },
      free_text_raw: "Open to homes or small multifamily.",
      current_situation: { status: "renting" },
      financing: "pre_approved",
      budget_min: 500000,
      budget_max: 900000,
      bedrooms: "3",
      property_category: "both",
      single_family_property_type: ["house"],
      property_type: ["house"]
    });

    expect(decision.next_question_id).toBe("multifamily_property_type");
  });

  it("guards an AI done decision when a property branch detail is still pending", () => {
    const decision = safeNextQuestionDecision(
      {
        answered_question_ids: [
          "timeline",
          "free_text",
          "current_situation",
          "financing",
          "preapproval_upload",
          "budget",
          "bedrooms",
          "property_category",
          "single_family_property_type"
        ],
        timeline: { preset: "30_days" },
        free_text_raw: "Open to homes or small multifamily.",
        current_situation: { status: "renting" },
        financing: "pre_approved",
        budget_min: 500000,
        budget_max: 900000,
        bedrooms: "3",
        property_category: "both",
        single_family_property_type: ["house"],
        property_type: ["house"]
      },
      { next_question_id: "done", reason: "Bad early finish." }
    );

    expect(decision.next_question_id).toBe("multifamily_property_type");
  });

  it("does not force property questions onto browsing-track buyers", () => {
    const decision = fallbackNextQuestion({
      answered_question_ids: [
        "timeline",
        "free_text",
        "current_situation",
        "financing",
        "financing_help",
        "budget",
        "bedrooms",
        "neighborhoods",
        "must_haves"
      ],
      timeline: { preset: "just_exploring" },
      free_text_raw: "Just browsing options.",
      current_situation: { status: "renting" },
      financing: "not_started",
      financing_help: "no",
      budget_min: 500000,
      budget_max: 900000,
      bedrooms: "3",
      neighborhoods: ["Mueller"],
      must_haves: ["yard"]
    });

    expect(decision.next_question_id).toBe("done");
  });
});
