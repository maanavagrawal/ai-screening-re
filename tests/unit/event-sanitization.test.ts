import { describe, expect, it } from "vitest";
import { sanitizeEventMetadata } from "@/lib/events";

describe("event metadata sanitization", () => {
  it("removes raw intake answers before analytics storage", () => {
    const metadata = sanitizeEventMetadata("intake_question_answered", {
      q_id: "neighborhoods",
      answer: ["East Austin", "Mueller"]
    });

    expect(metadata).toEqual({
      q_id: "neighborhoods",
      answer_kind: "array",
      selected_count: 2,
      has_value: true
    });
    expect("answer" in metadata).toBe(false);
  });

  it("keeps listing ids for activity labels but drops arbitrary metadata", () => {
    expect(
      sanitizeEventMetadata("listing_viewed", {
        listing_id: "listing-1",
        exact_address: "1811 Willow Creek Drive"
      })
    ).toEqual({ listing_id: "listing-1" });
  });
});
