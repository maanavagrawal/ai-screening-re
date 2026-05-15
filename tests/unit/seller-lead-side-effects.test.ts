import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLead } from "@/lib/leads";
import type { Agent } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  generateBrief: vi.fn(),
  generateMatchReasons: vi.fn()
}));

vi.mock("@/lib/ai/anthropic", () => ({
  generateBrief: mocks.generateBrief,
  generateMatchReasons: mocks.generateMatchReasons
}));

const agent: Agent = {
  id: "agent_seller_test",
  user_id: "user_seller_test",
  slug: "maya",
  name: "Maya Chen",
  headshot_url: null,
  bio: "Austin advisor",
  market: "Austin, TX",
  neighborhoods: ["East Austin"],
  phone: "+15125550100",
  email: "maya@example.com",
  closed_volume_usd: 0,
  buyers_placed: 0,
  accent_color: "#C97B5C"
};

describe("seller lead side effects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a seller lead without buyer match or buyer brief generation", async () => {
    const lead = await createLead({
      agent,
      kind: "seller",
      sessionId: `seller-session-${Date.now()}`,
      phone: "+15125550123",
      email: "seller@example.com",
      firstName: "Sam",
      preferences: {
        intent: "seller",
        source: "seller_entry",
        seller: {
          property_address: "123 Seller Street",
          timeframe: "1_3_months",
          notes: "Trying to understand prep before listing."
        }
      },
      freeTextRaw: "Trying to understand prep before listing."
    });

    expect(lead.preferences.intent).toBe("seller");
    expect(lead.source).toBe("seller_entry");
    expect(lead.temperature).toBe("warm");
    expect(lead.brief).toMatchObject({
      priority: "warm",
      one_line_summary: expect.stringContaining("Sam")
    });
    expect(mocks.generateBrief).not.toHaveBeenCalled();
    expect(mocks.generateMatchReasons).not.toHaveBeenCalled();
  });
});
