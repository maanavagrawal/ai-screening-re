import { z } from "zod";
import { EVENT_TYPES } from "@/lib/constants";
import { addDevEvents, getDevEventsForLead } from "@/lib/dev-store";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Agent, EventRecord, Lead } from "@/lib/types";

export const EventInputSchema = z.object({
  event_type: z.enum(EVENT_TYPES),
  metadata: z.record(z.unknown()).default({})
});

export const EventBatchSchema = z.object({
  session_id: z.string().min(8),
  agent_slug: z.string().min(1),
  lead_id: z.string().uuid().optional().nullable(),
  events: z.array(EventInputSchema).min(1).max(50)
});

export async function logEvents(input: {
  agent: Agent;
  sessionId: string;
  leadId?: string | null;
  events: Array<z.infer<typeof EventInputSchema>>;
}) {
  const rows = input.events.map((event) => ({
    session_id: input.sessionId,
    lead_id: input.leadId ?? null,
    agent_id: input.agent.id,
    event_type: event.event_type,
    metadata: event.metadata ?? {}
  }));

  const supabase = getServiceSupabase();
  if (!supabase) return addDevEvents(rows);

  const { data, error } = await supabase.from("events").insert(rows).select("*");
  if (error) throw new Error(`Failed to log events: ${error.message}`);
  return data as EventRecord[];
}

export async function getEventsForLead(lead: Lead): Promise<EventRecord[]> {
  const supabase = getServiceSupabase();
  if (!supabase) return getDevEventsForLead(lead);

  const [leadEvents, sessionEvents] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("agent_id", lead.agent_id)
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .eq("agent_id", lead.agent_id)
      .eq("session_id", lead.session_id)
      .order("created_at", { ascending: true })
  ]);

  if (leadEvents.error) throw new Error(`Failed to load lead events: ${leadEvents.error.message}`);
  if (sessionEvents.error) throw new Error(`Failed to load session events: ${sessionEvents.error.message}`);

  const byId = new Map<string, EventRecord>();
  for (const event of ([...(sessionEvents.data ?? []), ...(leadEvents.data ?? [])] as EventRecord[])) {
    byId.set(event.id, event);
  }

  return Array.from(byId.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
}
