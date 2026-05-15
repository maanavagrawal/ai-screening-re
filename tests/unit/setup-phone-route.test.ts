import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/setup/phone/send/route";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  saveSetupDraft: vi.fn(),
  setDevAgentVerifyCode: vi.fn(),
  twilio: vi.fn(),
  createVerification: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserId: mocks.getCurrentUserId
}));

vi.mock("@/lib/setup/drafts", () => ({
  saveSetupDraft: mocks.saveSetupDraft
}));

vi.mock("@/lib/dev-store", () => ({
  setDevAgentVerifyCode: mocks.setDevAgentVerifyCode
}));

vi.mock("twilio", () => ({
  default: mocks.twilio
}));

const originalEnv = { ...process.env };

function request(phone = "+1 512 555 0141") {
  return new Request("https://app.example.com/api/setup/phone/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone })
  });
}

describe("/api/setup/phone/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "token",
      TWILIO_VERIFY_SERVICE_SID: "VA123"
    };
    mocks.getCurrentUserId.mockResolvedValue("user_123");
    mocks.twilio.mockReturnValue({
      verify: {
        v2: {
          services: () => ({
            verifications: {
              create: mocks.createVerification
            }
          })
        }
      }
    });
  });

  it("returns an actionable error when Twilio trial mode blocks an unverified recipient", async () => {
    mocks.createVerification.mockRejectedValue(
      Object.assign(new Error("The phone number is unverified"), {
        status: 403,
        code: 21608,
        moreInfo: "https://www.twilio.com/docs/errors/21608"
      })
    );

    const response = await POST(request());
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected response");
    const body = await response.json();

    expect(response.status).toBe(424);
    expect(body.code).toBe("TWILIO_TRIAL_UNVERIFIED_NUMBER");
    expect(body.error).toContain("trial mode");
    expect(mocks.saveSetupDraft).not.toHaveBeenCalled();
  });

  it("saves the normalized phone only after Twilio accepts the verification request", async () => {
    mocks.createVerification.mockResolvedValue({ status: "pending" });

    const response = await POST(request());
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected response");

    expect(response.status).toBe(200);
    expect(mocks.saveSetupDraft).toHaveBeenCalledWith({
      userId: "user_123",
      currentStep: "phone",
      data: { phone: "+15125550141", phoneVerified: false }
    });
  });
});
