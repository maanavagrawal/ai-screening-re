import { describe, expect, it } from "vitest";
import { isUploadedFile, safeStoragePathSegment, safeUploadFileName } from "@/lib/uploads";

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

  it("sanitizes user-controlled storage path pieces", () => {
    expect(safeStoragePathSegment("../session/with/slashes")).toBe("-session-with-slashes");
    expect(safeUploadFileName("../../Loan Approval (final).pdf")).toBe("Loan-Approval-final-.pdf");
    expect(safeUploadFileName("../../../")).toBe("upload");
  });
});
