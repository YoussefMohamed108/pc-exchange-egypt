import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/env";
export async function GET() {
  return NextResponse.json(
    {
      service: "pc-exchange-web",
      status: "ok",
      database_configured: !!getSupabaseConfig(),
      version: "0.1.0",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
