import { NextResponse } from "next/server";
import { consumeAgentMagicLink, setAgentSession } from "@/lib/auth/session";
import { hasPostgresEnv } from "@/lib/db/postgres";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || !hasPostgresEnv()) {
    return NextResponse.redirect(new URL("/signup", url.origin));
  }

  const link = await consumeAgentMagicLink(token);
  if (!link) {
    return NextResponse.redirect(new URL("/signup?expired=1", url.origin));
  }

  await setAgentSession({ userId: link.user_id, email: link.email });
  return NextResponse.redirect(new URL("/setup/welcome", url.origin));
}
