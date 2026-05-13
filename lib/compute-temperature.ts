import type { EventRecord, Lead } from "@/lib/types";

export type LeadTemperature = "hot" | "warm" | "browsing";

export type TemperatureResult = {
  temperature: LeadTemperature;
  score: number;
  reasons: string[];
};

function eventCount(events: EventRecord[], eventType: string) {
  return events.filter((event) => event.event_type === eventType).length;
}

function hasEvent(events: EventRecord[], eventType: string) {
  return events.some((event) => event.event_type === eventType);
}

function hasRecentActivity(lead: Lead, events: EventRecord[], now: Date) {
  const latest = events
    .map((event) => new Date(event.created_at).getTime())
    .concat(new Date(lead.created_at).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  return latest ? now.getTime() - latest < 7 * 24 * 60 * 60 * 1000 : false;
}

export function computeTemperature(
  lead: Lead,
  events: EventRecord[],
  now = new Date()
): TemperatureResult {
  let score = 0;
  const reasons: string[] = [];

  if (lead.tier === "requested_showing") {
    score += 3;
    reasons.push("Requested a showing");
  }

  if (hasEvent(events, "showing_verification_completed")) {
    score += 2;
    reasons.push("Completed phone verification");
  }

  if (lead.phone_verified) {
    score += 2;
    reasons.push("Phone is verified");
  }

  if (hasEvent(events, "preapproval_uploaded") || lead.preapproval_url) {
    score += 2;
    reasons.push("Shared pre-approval");
  }

  const longViews = events.filter(
    (event) =>
      event.event_type === "listing_viewed" &&
      typeof event.metadata.duration_ms === "number" &&
      event.metadata.duration_ms > 30_000
  ).length;
  if (longViews) {
    score += longViews;
    reasons.push(`${longViews} long listing view${longViews === 1 ? "" : "s"}`);
  }

  const replays = eventCount(events, "listing_video_replayed");
  if (replays > 1) {
    score += 2;
    reasons.push("Replayed listing video");
  }

  if (hasEvent(events, "returned_to_matches")) {
    score += 1;
    reasons.push("Returned to matches");
  }

  if (hasEvent(events, "abandoned_showing_request")) {
    score += 3;
    reasons.push("Abandoned a showing request");
  }

  if (lead.tier === "browsing") {
    score -= 1;
    reasons.push("Marked as browsing");
  }

  if (!hasRecentActivity(lead, events, now)) {
    score -= 2;
    reasons.push("No activity in the last 7 days");
  }

  const temperature = score >= 6 ? "hot" : score >= 3 ? "warm" : "browsing";
  return { temperature, score, reasons: reasons.slice(0, 3) };
}
