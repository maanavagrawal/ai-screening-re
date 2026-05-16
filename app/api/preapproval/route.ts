import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";
import { logEvents } from "@/lib/events";
import { getServiceSupabase } from "@/lib/supabase/service";
import { resolveAgentBySlug } from "@/lib/resolve-agent";
import { safeStoragePathSegment, safeUploadFileName } from "@/lib/uploads";

const BodySchema = z.object({
  agent_slug: z.string().min(1),
  session_id: z.string().min(8).max(160),
  file_name: z.string().min(1).max(220),
  content_type: z.string().min(1)
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const body = parsed.data;
  const agent = await resolveAgentBySlug(body.agent_slug);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const allowed = body.content_type === "application/pdf" || body.content_type.startsWith("image/");
  if (!allowed) return NextResponse.json({ error: "Only PDF and image uploads are allowed" }, { status: 400 });

  const path = `${agent.id}/${safeStoragePathSegment(body.session_id, "session")}/${crypto.randomUUID()}-${safeUploadFileName(body.file_name)}`;
  const supabase = getServiceSupabase();

  if (!supabase) {
    await logEvents({
      agent,
      sessionId: body.session_id,
      events: [{ event_type: "preapproval_uploaded", metadata: { path, local: true } }]
    });
    return NextResponse.json({ path, signedUrl: null, local: true });
  }

  const { data, error } = await supabase.storage.from("preapprovals").createSignedUploadUrl(path);
  if (error) throw new Error(`Failed to create upload URL: ${error.message}`);

  await logEvents({
    agent,
    sessionId: body.session_id,
    events: [{ event_type: "preapproval_uploaded", metadata: { path } }]
  });

  return NextResponse.json({ path, signedUrl: data.signedUrl, token: data.token });
}
