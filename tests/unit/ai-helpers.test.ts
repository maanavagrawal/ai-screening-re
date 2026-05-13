import { describe, expect, it } from "vitest";
import { fallbackExtraction, fallbackNextQuestion } from "@/lib/ai/anthropic";
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

  it("does not ask anything_else when core preferences are already clear", () => {
    const decision = fallbackNextQuestion({
      answered_question_ids: [
        "timeline",
        "free_text",
        "current_situation",
        "financing",
        "preapproval_upload",
        "bathrooms",
        "property_type",
        "first_time_buyer"
      ],
      timeline: { preset: "30_days" },
      financing: "pre_approved",
      bedrooms: "3",
      bathrooms: "2",
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
});
