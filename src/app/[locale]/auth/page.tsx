import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { dictionary } from "@/lib/i18n";
import { getSupabaseConfig } from "@/lib/env";
import { safeReturnPath } from "@/lib/validation";
import type { AuthMode } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Your account", robots: { index: false, follow: false } };
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; next?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const q = await searchParams,
    t = dictionary(locale);
  const mode: AuthMode =
    q.mode === "register" || q.mode === "reset" || q.mode === "update" || q.mode === "resend"
      ? q.mode
      : "login";
  return (
    <div className="container auth-layout">
      <div className="auth-art">
        <h1>
          {t.heroLine1}
          <br />
          {t.heroLine2}
        </h1>
        <p>{t.heroText}</p>
        <div className="auth-parts-art" aria-hidden="true">
          <span>SECOND LIFE.</span>
          <strong>
            Next
            <br />
            chapter.
          </strong>
          <span>PC EXCHANGE / EGYPT</span>
        </div>
      </div>
      <AuthForm
        locale={locale}
        mode={mode}
        next={safeReturnPath(q.next, locale)}
        configured={!!getSupabaseConfig()}
        confirmationError={!!q.error}
        localMail={process.env.NEXT_PUBLIC_AUTH_EMAIL_DELIVERY === "local"}
      />
    </div>
  );
}
