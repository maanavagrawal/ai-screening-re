import { describe, expect, it } from "vitest";
import { parseAgentLinkInput } from "@/lib/root/agent-link";

describe("parseAgentLinkInput", () => {
  it("normalizes direct slugs and slash paths", () => {
    expect(parseAgentLinkInput(" Maya ")).toBe("maya");
    expect(parseAgentLinkInput("/Maya")).toBe("maya");
    expect(parseAgentLinkInput("/maya?src=instagram")).toBe("maya");
  });

  it("normalizes full URLs to the first path segment", () => {
    expect(parseAgentLinkInput("https://example.com/maya?src=qr")).toBe("maya");
    expect(parseAgentLinkInput("http://localhost:3000/david/seller")).toBe("david");
  });

  it("rejects malformed values and reserved app paths", () => {
    expect(parseAgentLinkInput("https://")).toBeNull();
    expect(parseAgentLinkInput("not a slug")).toBeNull();
    expect(parseAgentLinkInput("/dashboard")).toBeNull();
    expect(parseAgentLinkInput("/api/agents")).toBeNull();
    expect(parseAgentLinkInput("/signup")).toBeNull();
  });
});
