import { NextResponse } from "next/server";
import { hasPostgresEnv, query } from "@/lib/db/postgres";
import { providerConfigStatus } from "@/lib/provider-config";

export async function GET() {
  const providers = providerConfigStatus();
  if (!hasPostgresEnv()) {
    return NextResponse.json(
      { ok: providers.ok, database: "not_configured", providers },
      { status: providers.ok ? 200 : 503 }
    );
  }

  await query("select 1");
  return NextResponse.json(
    { ok: providers.ok, database: "ok", providers },
    { status: providers.ok ? 200 : 503 }
  );
}
