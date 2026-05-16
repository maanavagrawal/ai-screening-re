import { getEventsForAgent } from "@/lib/events";
import type { EventRecord } from "@/lib/types";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export const DROPOFF_STEPS = [
  { event_type: "intake_started", label: "Started" },
  { event_type: "intake_free_text_submitted", label: "Shared search notes" },
  { event_type: "intake_completed", label: "Finished intake" },
  { event_type: "contact_gate_viewed", label: "Reached contact gate" },
  { event_type: "lead_created", label: "Created lead" },
  { event_type: "showing_sheet_opened", label: "Opened showing request" },
  { event_type: "showing_request_submitted", label: "Requested showing" }
] as const;

export type DropoffAnalytics = {
  sessionsStarted: number;
  anonymousAbandoned: number;
  steps: Array<{
    event_type: string;
    label: string;
    count: number;
    dropoffAfter: number;
    dropoffRate: number;
  }>;
};

export async function getDropoffAnalytics(agentId: string) {
  return buildDropoffAnalytics(await getEventsForAgent(agentId));
}

export function buildDropoffAnalytics(events: EventRecord[], now = new Date()): DropoffAnalytics {
  const sessions = new Map<string, EventRecord[]>();
  for (const event of events) {
    const group = sessions.get(event.session_id) ?? [];
    group.push(event);
    sessions.set(event.session_id, group);
  }

  const reached = DROPOFF_STEPS.map((step) => {
    let count = 0;
    for (const group of sessions.values()) {
      if (group.some((event) => event.event_type === step.event_type)) count += 1;
    }
    return { ...step, count };
  });

  const steps = reached.map((step, index) => {
    const next = reached[index + 1];
    const dropoffAfter = next ? Math.max(0, step.count - next.count) : 0;
    return {
      event_type: step.event_type,
      label: step.label,
      count: step.count,
      dropoffAfter,
      dropoffRate: step.count > 0 ? dropoffAfter / step.count : 0
    };
  });

  const anonymousAbandoned = Array.from(sessions.values()).filter((group) => {
    const started = group.some((event) => event.event_type === "intake_started");
    const becameLead = group.some((event) => event.event_type === "lead_created");
    const last = group.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return started && !becameLead && last && now.getTime() - new Date(last.created_at).getTime() > THIRTY_MINUTES_MS;
  }).length;

  return {
    sessionsStarted: reached[0]?.count ?? 0,
    anonymousAbandoned,
    steps
  };
}
