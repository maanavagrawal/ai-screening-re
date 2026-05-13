import { describe, expect, it } from "vitest";
import { resolveAgent, resolveAgentBySlug } from "@/lib/resolve-agent";

describe("resolveAgent", () => {
  it("resolves a path-based agent slug", async () => {
    const agent = await resolveAgent(new Request("https://example.com/maya"));
    expect(agent?.slug).toBe("maya");
  });

  it("resolves API requests from agent_slug query param", async () => {
    const agent = await resolveAgent(new Request("https://example.com/api/matches/123?agent_slug=david"));
    expect(agent?.slug).toBe("david");
  });

  it("lets an explicit query slug win over a conflicting header", async () => {
    const agent = await resolveAgent(
      new Request("https://example.com/api/matches/123?agent_slug=david", {
        headers: { "x-agent-slug": "maya" }
      })
    );
    expect(agent?.slug).toBe("david");
  });

  it("resolves a normalized direct slug", async () => {
    const agent = await resolveAgentBySlug(" Maya ");
    expect(agent?.slug).toBe("maya");
  });

  it("returns null for unknown agents", async () => {
    const agent = await resolveAgent(new Request("https://example.com/not-real"));
    expect(agent).toBeNull();
  });
});
