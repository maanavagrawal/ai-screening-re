import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("preapproval upload client", () => {
  it("does not persist signed upload URLs into buyer intake answers", () => {
    const source = readFileSync("components/intake/questions/preapproval-upload-question.tsx", "utf8");

    expect(source).toContain("onAnswer(null)");
    expect(source).not.toContain("onAnswer(data.signedUrl");
  });
});
