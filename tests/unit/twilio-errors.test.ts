import { describe, expect, it } from "vitest";
import { isTwilioTrialUnverifiedNumber, twilioVerifyFailure } from "@/lib/twilio-errors";

describe("Twilio verification errors", () => {
  it("maps trial-account unverified recipient failures to an actionable response", () => {
    const error = Object.assign(new Error("The phone number is unverified"), {
      status: 403,
      code: 21608,
      moreInfo: "https://www.twilio.com/docs/errors/21608"
    });

    expect(isTwilioTrialUnverifiedNumber(error)).toBe(true);
    expect(twilioVerifyFailure(error)).toEqual({
      status: 424,
      body: {
        error:
          "This Twilio account is still in trial mode, so it can only text numbers that are verified in Twilio. Upgrade Twilio or verify this phone number in Twilio, then send the code again.",
        code: "TWILIO_TRIAL_UNVERIFIED_NUMBER",
        providerCode: 21608,
        action: "Upgrade the Twilio account for real customer verification, or add this number under Twilio verified caller IDs while testing."
      }
    });
  });

  it("maps other Twilio send failures without leaking provider internals", () => {
    expect(twilioVerifyFailure({ status: 500, code: 30001, message: "provider unavailable" })).toEqual({
      status: 502,
      body: {
        error: "Twilio could not send the verification code. Please try again in a minute.",
        code: "TWILIO_VERIFY_UNAVAILABLE",
        providerCode: 30001
      }
    });
  });
});
