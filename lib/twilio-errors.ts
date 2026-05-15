export type TwilioFailurePayload = {
  error: string;
  code: "TWILIO_TRIAL_UNVERIFIED_NUMBER" | "TWILIO_VERIFY_UNAVAILABLE";
  providerCode?: number | string;
  action?: string;
};

type TwilioErrorLike = {
  code?: number | string;
  status?: number;
  message?: string;
  moreInfo?: string;
};

function twilioErrorLike(error: unknown): TwilioErrorLike {
  if (!error || typeof error !== "object") return {};
  const record = error as Record<string, unknown>;
  return {
    code: typeof record.code === "number" || typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
    moreInfo: typeof record.moreInfo === "string" ? record.moreInfo : undefined
  };
}

export function isTwilioTrialUnverifiedNumber(error: unknown) {
  const twilioError = twilioErrorLike(error);
  return String(twilioError.code) === "21608";
}

export function twilioVerifyFailure(error: unknown): { status: number; body: TwilioFailurePayload } | null {
  const twilioError = twilioErrorLike(error);
  if (!twilioError.code && !twilioError.message) return null;

  if (isTwilioTrialUnverifiedNumber(error)) {
    return {
      status: 424,
      body: {
        error:
          "This Twilio account is still in trial mode, so it can only text numbers that are verified in Twilio. Upgrade Twilio or verify this phone number in Twilio, then send the code again.",
        code: "TWILIO_TRIAL_UNVERIFIED_NUMBER",
        providerCode: twilioError.code,
        action: "Upgrade the Twilio account for real customer verification, or add this number under Twilio verified caller IDs while testing."
      }
    };
  }

  return {
    status: 502,
    body: {
      error: "Twilio could not send the verification code. Please try again in a minute.",
      code: "TWILIO_VERIFY_UNAVAILABLE",
      providerCode: twilioError.code
    }
  };
}
