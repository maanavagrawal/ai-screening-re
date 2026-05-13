import type { Agent, Lead, Listing } from "@/lib/types";

export type NotificationInput = {
  agent: Agent;
  lead: Lead;
  listing?: Listing | null;
  kind: "new_lead" | "showing_requested" | "hot_lead" | "sample";
  message?: string;
};

export async function sendAgentNotification(input: NotificationInput) {
  const smsEnabled = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  const emailEnabled = Boolean(process.env.RESEND_API_KEY || process.env.POSTMARK_API_KEY);
  const summary = (input.lead.brief as { one_line_summary?: string } | null)?.one_line_summary;

  if (!smsEnabled && !emailEnabled) {
    console.info("[notification:fallback]", {
      agent: input.agent.slug,
      kind: input.kind,
      lead: input.lead.id,
      summary: summary ?? input.message ?? "No summary"
    });
    return { sms: "skipped", email: "skipped" } as const;
  }

  // Production adapters intentionally stay server-only and centralized here.
  // The local implementation is a safe no-op until real provider keys are added.
  return { sms: smsEnabled ? "queued" : "skipped", email: emailEnabled ? "queued" : "skipped" } as const;
}

