import { beforeEach, describe, expect, it, vi } from "vitest";
import { onboardAgent } from "@/lib/onboard-agent";
import type { Agent } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  getServiceSupabase: vi.fn()
}));

vi.mock("@/lib/db/postgres", () => ({
  transaction: mocks.transaction
}));

vi.mock("@/lib/supabase/service", () => ({
  getServiceSupabase: mocks.getServiceSupabase
}));

const insertedAgent: Agent = {
  id: "00000000-0000-4000-8000-000000000001",
  user_id: "00000000-0000-4000-8000-000000000002",
  slug: "jerry",
  name: "Jerry Agent",
  headshot_url: "https://example.com/headshot.jpg",
  bio: "Austin advisor",
  market: "Austin, TX",
  neighborhoods: ["East Austin"],
  phone: "+15125550141",
  email: "jerry@example.com",
  closed_volume_usd: 0,
  buyers_placed: 0,
  accent_color: "#C97B5C"
};

describe("onboardAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServiceSupabase.mockReturnValue(null);
  });

  it("normalizes blank optional listing media from setup drafts", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [insertedAgent] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    mocks.transaction.mockImplementation(async (fn) => fn({ query }));

    await onboardAgent({
      userId: "00000000-0000-4000-8000-000000000002",
      slug: "jerry",
      name: "Jerry Agent",
      market: "Austin, TX",
      neighborhoods: ["East Austin", "Zilker", "Mueller", "Hyde Park"],
      headshotUrl: "https://example.com/headshot.jpg",
      bio: "Practical Austin buyer advisor with a clear read on homes.",
      phone: "+15125550141",
      email: "jerry@example.com",
      listings: [
        {
          address: "123 Maple St",
          price: 725000,
          beds: 3,
          baths: 2,
          neighborhood: "",
          features: ["yard"],
          dealBreakerFlags: [],
          videoUrl: "",
          videoSource: null,
          agent_note: "Good bones and a useful yard."
        }
      ]
    });

    const listingInsertCall = query.mock.calls.find(([sql]) => String(sql).includes("insert into listings"));
    expect(listingInsertCall?.[1][6]).toBeNull();
    expect(listingInsertCall?.[1][10]).toBeNull();
  });
});
