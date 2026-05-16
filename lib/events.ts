import { z } from "zod";
import { EVENT_TYPES } from "@/lib/constants";
import { addDevEvents, getDevEventsForAgent as getDevEventsForAgentRows, getDevEventsForLead } from "@/lib/dev-store";
import { hasPostgresEnv, query } from "@/lib/db/postgres";
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
    metadata: sanitizeEventMetadata(event.event_type, event.metadata ?? {})
  }));

  if (hasPostgresEnv()) {
    const values: EventRecord[] = [];
    for (const row of rows) {
      const result = await query<EventRecord>(
        `insert into events (session_id, lead_id, agent_id, event_type, metadata)
         values ($1, $2, $3, $4, $5)
         returning *`,
        [row.session_id, row.lead_id, row.agent_id, row.event_type, JSON.stringify(row.metadata)]
      );
      if (result?.rows[0]) values.push(result.rows[0]);
    }
    return values;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return addDevEvents(rows);

  const { data, error } = await supabase.from("events").insert(rows).select("*");
  if (error) throw new Error(`Failed to log events: ${error.message}`);
  return data as EventRecord[];
}

export function sanitizeEventMetadata(eventType: string, metadata: Record<string, unknown>) {
  const listingId = typeof metadata.listing_id === "string" ? metadata.listing_id : undefined;
  if (eventType === "intake_question_answered") {
    const qId = typeof metadata.q_id === "string" ? metadata.q_id : undefined;
    return {
      ...(qId ? { q_id: qId } : {}),
      answer_kind: typeof metadata.answer_kind === "string" ? metadata.answer_kind : answerKind(metadata.answer),
      ...(typeof metadata.selected_count === "number"
        ? { selected_count: metadata.selected_count }
        : Array.isArray(metadata.answer)
          ? { selected_count: metadata.answer.length }
          : {}),
      has_value: typeof metadata.has_value === "boolean" ? metadata.has_value : hasAnswerValue(metadata.answer)
    };
  }

  return {
    ...(listingId ? { listing_id: listingId } : {}),
    ...(typeof metadata.source === "string" ? { source: metadata.source } : {}),
    ...(typeof metadata.start_over === "boolean" ? { start_over: metadata.start_over } : {}),
    ...(typeof metadata.length_chars === "number" ? { length_chars: metadata.length_chars } : {})
  };
}

export async function getEventsForAgent(agentId: string): Promise<EventRecord[]> {
  if (hasPostgresEnv()) {
    const { rows } = (await query<EventRecord>(
      `select *
       from events
       where agent_id = $1
       order by created_at asc`,
      [agentId]
    )) ?? { rows: [] };
    return rows;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return getDevEventsForAgentRows(agentId);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load agent events: ${error.message}`);
  return (data ?? []) as EventRecord[];
}

export async function getEventsForLead(lead: Lead): Promise<EventRecord[]> {
  if (hasPostgresEnv()) {
    const { rows } = (await query<EventRecord>(
      `select distinct on (id) *
       from events
       where agent_id = $1 and (lead_id = $2 or session_id = $3)
       order by id, created_at asc`,
      [lead.agent_id, lead.id, lead.session_id]
    )) ?? { rows: [] };
    return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

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

function answerKind(answer: unknown) {
  if (Array.isArray(answer)) return "array";
  if (answer === null || answer === undefined || answer === "") return "empty";
  return typeof answer;
}

function hasAnswerValue(answer: unknown) {
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === "string") return answer.trim().length > 0;
  return answer !== null && answer !== undefined;
}
