import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseClient } from "./supabase/server";
import { canManageInventory, canInspect, type Role, type Locale } from "./domain";
import { safeReturnPath } from "./validation";
export const getAccount = cache(async () => {
  const supabase = await createSupabaseClient();
  if (!supabase) return { user: null, roles: [] as Role[], configured: false, name: "" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, roles: [] as Role[], configured: true, name: "" };
  const [roleResult, profileResult] = await Promise.all([
    supabase.from("account_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (roleResult.error || profileResult.error)
    throw new Error("Account permissions could not be loaded.");
  return {
    user,
    roles: (roleResult.data || []).map((r) => r.role),
    configured: true,
    name: profileResult.data?.full_name || "",
  };
});
export async function requireUser(locale: Locale, next?: string) {
  const account = await getAccount();
  if (!account.user)
    redirect(
      `/${locale}/auth?mode=login${next ? `&next=${encodeURIComponent(safeReturnPath(next, locale))}` : ""}`,
    );
  return account;
}
export async function requireStaff(
  locale: Locale,
  scope: "inventory" | "inspection" = "inventory",
) {
  const account = await requireUser(locale);
  if (!(scope === "inspection" ? canInspect(account.roles) : canManageInventory(account.roles)))
    redirect(`/${locale}/account?notice=forbidden`);
  return account;
}
