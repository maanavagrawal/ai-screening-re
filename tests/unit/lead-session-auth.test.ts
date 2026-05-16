import { describe, expect, it } from "vitest";
import { isLeadSessionAuthorized } from "@/lib/lead-session-auth";

const lead = {
  id: "lead-1",
  session_id: "session-1"
};

describe("lead session authorization", () => {
  it("accepts the lead cookie or matching buyer session cookie", () => {
    expect(isLeadSessionAuthorized(lead, "lead-1", null)).toBe(true);
    expect(isLeadSessionAuthorized(lead, null, "session-1")).toBe(true);
  });

  it("rejects callers without a matching lead or session cookie", () => {
    expect(isLeadSessionAuthorized(lead, null, null)).toBe(false);
    expect(isLeadSessionAuthorized(lead, "lead-2", "session-2")).toBe(false);
  });
});
