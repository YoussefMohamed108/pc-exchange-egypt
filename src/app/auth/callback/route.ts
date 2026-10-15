import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/validation";
import { confirmationDestination } from "@/lib/auth-redirect";
import type { EmailOtpType } from "@supabase/supabase-js";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code"),
    locale = request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en",
    client = await createSupabaseClient();
  const token_hash = request.nextUrl.searchParams.get("token_hash"),
    type = request.nextUrl.searchParams.get("type");
  if (
    client &&
    token_hash &&
    type &&
    ["signup", "recovery", "email", "email_change"].includes(type)
  ) {
    const { error } = await client.auth.verifyOtp({ token_hash, type: type as EmailOtpType });
    if (!error)
      return NextResponse.redirect(
        new URL(
          confirmationDestination(type, locale, request.nextUrl.searchParams.get("next")),
          request.nextUrl.origin,
        ),
      );
  }
  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          safeReturnPath(request.nextUrl.searchParams.get("next"), locale),
          request.nextUrl.origin,
        ),
      );
  }
  return NextResponse.redirect(
    new URL(`/${locale}/auth?error=confirmation`, request.nextUrl.origin),
  );
}
