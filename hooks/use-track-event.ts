"use client";

import { useCallback, useEffect, useRef } from "react";
import type { EVENT_TYPES } from "@/lib/constants";
import { useSessionId } from "@/hooks/use-session-id";

type EventType = (typeof EVENT_TYPES)[number];
type QueuedEvent = {
  event_type: EventType;
  metadata: Record<string, unknown>;
};

export function useTrackEvent(agentSlug: string, leadId?: string | null) {
  const sessionId = useSessionId();
  const queue = useRef<QueuedEvent[]>([]);

  const flush = useCallback(() => {
    if (!sessionId || queue.current.length === 0) return;
    const events = queue.current.splice(0, queue.current.length);
    const payload = JSON.stringify({
      agent_slug: agentSlug,
      session_id: sessionId,
      lead_id: leadId || null,
      events
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/events", blob)) return;
    }

    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => {
      queue.current.unshift(...events);
    });
  }, [agentSlug, leadId, sessionId]);

  useEffect(() => {
    const timer = window.setInterval(flush, 5000);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  return useCallback((event_type: EventType, metadata: Record<string, unknown> = {}) => {
    queue.current.push({ event_type, metadata });
  }, []);
}
