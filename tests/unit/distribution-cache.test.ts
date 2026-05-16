import { beforeEach, describe, expect, it, vi } from "vitest";
import { regenerateDistributionData } from "@/lib/dashboard/distribution";
import type { Agent } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  generateReplyTemplates: vi.fn(),
  getListingsForAgent: vi.fn(),
  hasPostgresEnv: vi.fn(),
  query: vi.fn()
}));

vi.mock("@/lib/ai/anthropic", () => ({
  generateReplyTemplates: mocks.generateReplyTemplates
}));

vi.mock("@/lib/listings", () => ({
  getListingsForAgent: mocks.getListingsForAgent
}));

vi.mock("@/lib/db/postgres", () => ({
  hasPostgresEnv: mocks.hasPostgresEnv,
  query: mocks.query
}));

const agent: Agent = {
  id: "00000000-0000-4000-8000-000000000001",
  user_id: "00000000-0000-4000-8000-000000000002",
  slug: "maya",
  name: "Maya Chen",
  headshot_url: null,
  bio: "Austin buyer specialist",
  market: "Austin, TX",
  neighborhoods: ["East Austin"],
  phone: null,
  email: null,
  closed_volume_usd: 0,
  buyers_placed: 0,
  accent_color: "#C97B5C"
};

describe("distribution template cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateReplyTemplates.mockResolvedValue({ templates: [] });
    mocks.getListingsForAgent.mockResolvedValue([]);
    mocks.hasPostgresEnv.mockReturnValue(true);
  });

  it("returns generated distribution data without caching when the agent row no longer exists", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });

    const data = await regenerateDistributionData(agent, [], "https://app.example.com");

    expect(data.bioTemplates[0]).toContain("https://app.example.com/maya");
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(String(mocks.query.mock.calls[0][0])).toContain("select id from agents");
  });

  it("tolerates a foreign-key race while writing the optional cache", async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ id: agent.id }] })
      .mockRejectedValueOnce(
        Object.assign(new Error("insert or update on table violates foreign key constraint"), {
          code: "23503",
          constraint: "agent_distribution_templates_agent_id_fkey"
        })
      );

    const data = await regenerateDistributionData(agent, [], "https://app.example.com");

    expect(data.replyTemplates).toEqual([]);
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });
});
