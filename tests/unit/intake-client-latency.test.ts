import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("buyer intake client latency", () => {
  it("does not wait on the next-question API for structured Continue taps", () => {
    const source = readFileSync("components/intake/intake-flow.tsx", "utf8");

    expect(source).toContain('from "@/lib/intake/next-question"');
    expect(source).not.toContain('fetch("/api/intake/next"');
  });
});
