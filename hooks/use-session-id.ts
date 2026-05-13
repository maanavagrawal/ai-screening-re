"use client";

import { useEffect, useState } from "react";

function createSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    const key = "buyer_session_id";
    const existing = window.localStorage.getItem(key);
    if (existing) {
      setSessionId(existing);
      return;
    }
    const created = createSessionId();
    window.localStorage.setItem(key, created);
    setSessionId(created);
  }, []);

  return sessionId;
}
