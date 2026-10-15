import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabase/server";
import { confirmationDestination } from "@/lib/auth-redirect";
const allowed = ["signup", "recovery", "email", "email_change"];
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams,
    token_hash = q.get("token_hash"),
    type = q.get("type"),
    locale = q.get("locale") === "ar" ? "ar" : "en",
    client = await createSupabaseClient();
  if (client && token_hash && type && allowed.includes(type)) {
    const { error } = await client.auth.verifyOtp({ token_hash, type: type as EmailOtpType });
    if (!error)
      return NextResponse.redirect(
        new URL(confirmationDestination(type, locale, q.get("next")), request.nextUrl.origin),
      );
  }
  return NextResponse.redirect(
    new URL(`/${locale}/auth?error=confirmation`, request.nextUrl.origin),
  );
}
