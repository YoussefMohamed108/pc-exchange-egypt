"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase/server";
import { authSchema, safeReturnPath } from "@/lib/validation";
import { isLocale, type Locale } from "@/lib/domain";
import { siteUrl } from "@/lib/env";
export type AuthState = {
  message?: "unavailable" | "error" | "email_sent" | "reset_sent" | "email_local" | "reset_local";
};
export type AuthMode = "login" | "register" | "reset" | "update" | "resend";
export async function authenticate(
  locale: Locale,
  mode: AuthMode,
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  if (!isLocale(locale)) return { message: "error" };
  const client = await createSupabaseClient();
  if (!client) return { message: "unavailable" };
  const email = String(form.get("email") || ""),
    password = String(form.get("password") || "");
  const localMail = process.env.NEXT_PUBLIC_AUTH_EMAIL_DELIVERY === "local";
  if (mode === "resend") {
    if (!z.email().max(254).safeParse(email).success) return { message: "error" };
    const { error } = await client.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback?locale=${locale}&next=/${locale}/auth/verified`,
      },
    });
    return { message: error ? "error" : localMail ? "email_local" : "email_sent" };
  }
  if (mode === "reset") {
    if (!z.email().max(254).safeParse(email).success) return { message: "error" };
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?locale=${locale}&next=/${locale}/auth?mode=update`,
    });
    return { message: error ? "error" : localMail ? "reset_local" : "reset_sent" };
  }
  if (mode === "update") {
    if (!z.string().min(10).max(128).safeParse(password).success) return { message: "error" };
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { message: "error" };
    const { error } = await client.auth.updateUser({ password });
    if (error) return { message: "error" };
    redirect(`/${locale}/account`);
  }
  const parsed = authSchema.safeParse({
    email,
    password,
    ...(mode === "register" ? { full_name: form.get("full_name") } : {}),
  });
  if (!parsed.success) return { message: "error" };
  if (mode === "register") {
    const { error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: parsed.data.full_name },
        emailRedirectTo: `${siteUrl()}/auth/callback?locale=${locale}&next=/${locale}/auth/verified`,
      },
    });
    return { message: error ? "error" : localMail ? "email_local" : "email_sent" };
  }
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { message: "error" };
  redirect(safeReturnPath(String(form.get("next") || ""), locale));
}
export async function signOut(locale: Locale) {
  if (!isLocale(locale)) return;
  const client = await createSupabaseClient();
  if (client) await client.auth.signOut();
  redirect(`/${locale}`);
}
