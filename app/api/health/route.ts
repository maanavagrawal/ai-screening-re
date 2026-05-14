import { NextResponse } from "next/server";
import { hasPostgresEnv, query } from "@/lib/db/postgres";

export async function GET() {
  if (!hasPostgresEnv()) {
    return NextResponse.json({ ok: true, database: "not_configured" });
  }

  await query("select 1");
  return NextResponse.json({ ok: true, database: "ok" });
}
