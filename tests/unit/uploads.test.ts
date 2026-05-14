import { describe, expect, it } from "vitest";
import { isUploadedFile } from "@/lib/uploads";

describe("isUploadedFile", () => {
  it("accepts form-data file objects without reading the global File constructor", () => {
    const uploaded = {
      size: 120,
      type: "image/jpeg",
      name: "headshot.jpg",
      arrayBuffer: async () => new ArrayBuffer(8)
    };

    expect(isUploadedFile(uploaded as unknown as FormDataEntryValue)).toBe(true);
  });

  it("rejects missing, text, or malformed form values", () => {
    expect(isUploadedFile(null)).toBe(false);
    expect(isUploadedFile("not-a-file")).toBe(false);
    expect(isUploadedFile({ size: 100 } as unknown as FormDataEntryValue)).toBe(false);
  });
});
