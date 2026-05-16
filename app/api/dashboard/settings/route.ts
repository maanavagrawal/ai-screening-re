import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentAgent, setAgentSession } from "@/lib/auth/session";
import { hasPostgresEnv, query } from "@/lib/db/postgres";
import { updateDevAgent } from "@/lib/dev-store";
import { normalizePhone } from "@/lib/phone";
import type { Agent, NotificationPreferences } from "@/lib/types";

const PatchSchema = z.object({
  name: z.string().min(2).optional(),
  market: z.string().min(2).optional(),
  headshot_url: z.string().min(8).nullable().optional(),
  bio: z.string().min(2).nullable().optional(),
  headline: z.string().nullable().optional(),
  sub_headline: z.string().nullable().optional(),
  voice_notes: z.string().nullable().optional(),
  neighborhoods: z.array(z.string()).optional(),
  phone: z.string().min(5).nullable().optional(),
  email: z.string().email().nullable().optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  paused: z.boolean().optional(),
  notification_preferences: z
    .object({
      new_lead: z.boolean().optional(),
      showing_requested: z.boolean().optional(),
      hot_lead: z.boolean().optional(),
      weekly_summary: z.boolean().optional()
    })
    .optional()
});

export async function GET() {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({ agent });
}

export async function PATCH(request: Request) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, PatchSchema);
  if ("response" in parsed) return parsed.response;

  const body = parsed.data;
  const patch: Partial<Agent> = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.market !== undefined ? { market: body.market } : {}),
    ...(body.headshot_url !== undefined ? { headshot_url: body.headshot_url } : {}),
    ...(body.bio !== undefined ? { bio: body.bio } : {}),
    ...(body.headline !== undefined ? { headline: body.headline } : {}),
    ...(body.sub_headline !== undefined ? { sub_headline: body.sub_headline } : {}),
    ...(body.voice_notes !== undefined ? { voice_notes: body.voice_notes } : {}),
    ...(body.neighborhoods !== undefined ? { neighborhoods: body.neighborhoods } : {}),
    ...(body.phone !== undefined ? { phone: body.phone ? normalizePhone(body.phone) ?? agent.phone : null } : {}),
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.accent_color !== undefined ? { accent_color: body.accent_color } : {}),
    ...(body.slug !== undefined ? { slug: body.slug } : {}),
    ...(body.paused !== undefined ? { paused: body.paused } : {}),
    ...(body.notification_preferences
      ? {
          notification_preferences: {
            new_lead: body.notification_preferences.new_lead ?? agent.notification_preferences?.new_lead ?? false,
            showing_requested:
              body.notification_preferences.showing_requested ??
              agent.notification_preferences?.showing_requested ??
              true,
            hot_lead: body.notification_preferences.hot_lead ?? agent.notification_preferences?.hot_lead ?? true,
            weekly_summary:
              body.notification_preferences.weekly_summary ??
              agent.notification_preferences?.weekly_summary ??
              false
          } satisfies NotificationPreferences
        }
      : {})
  };

  if (hasPostgresEnv()) {
    if (patch.slug && patch.slug !== agent.slug) {
      await query(
        `insert into domains (agent_id, domain, type, verified)
         values ($1, $2, 'path', true)
         on conflict (domain) do nothing`,
        [agent.id, `/${agent.slug}`]
      );
    }
    const keys = Object.keys(patch) as Array<keyof Agent>;
    if (!keys.length) return NextResponse.json({ agent });
    const assignments = keys.map((key, index) => `${String(key)} = $${index + 2}`).join(", ");
    const values = keys.map((key) => {
      const value = patch[key];
      return key === "notification_preferences" ? JSON.stringify(value) : value;
    });
    const { rows } = (await query<Agent>(
      `update agents set ${assignments} where id = $1 returning *`,
      [agent.id, ...values]
    )) ?? { rows: [] };
    const updated = rows[0];
    if (updated?.slug && updated.user_id) await setAgentSession({ userId: updated.user_id, agentSlug: updated.slug });
    return NextResponse.json({ agent: updated });
  }

  const updated = updateDevAgent(agent.id, patch);
  if (updated?.slug && updated.user_id) await setAgentSession({ userId: updated.user_id, agentSlug: updated.slug });
  return NextResponse.json({ agent: updated });
}
