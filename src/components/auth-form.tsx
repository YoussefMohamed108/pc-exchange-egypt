"use client";
import { useActionState } from "react";
import Link from "next/link";
import { authenticate, type AuthMode, type AuthState } from "@/app/actions/auth";
import { dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/domain";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
export function AuthForm({
  locale,
  mode,
  configured,
  next,
  confirmationError,
  localMail = false,
}: {
  locale: Locale;
  mode: AuthMode;
  configured: boolean;
  next: string;
  confirmationError: boolean;
  localMail?: boolean;
}) {
  const t = dictionary(locale),
    [state, action, pending] = useActionState(
      authenticate.bind(null, locale, mode),
      {} as AuthState,
    );
  const title =
    mode === "resend"
      ? locale === "ar"
        ? "إعادة إرسال التأكيد"
        : "Resend confirmation"
      : mode === "register"
        ? t.registerTitle
        : mode === "reset"
          ? t.resetTitle
          : mode === "update"
            ? t.updateTitle
            : t.loginTitle;
  const label =
    mode === "resend"
      ? locale === "ar"
        ? "إرسال رابط جديد"
        : "Send a new link"
      : mode === "register"
        ? t.register
        : mode === "reset"
          ? t.sendReset
          : mode === "update"
            ? t.updatePassword
            : t.login;
  const message = state.message
    ? {
        unavailable: t.authUnavailable,
        error: t.authFailure,
        email_sent: t.emailSent,
        reset_sent: t.genericReset,
        email_local:
          locale === "ar"
            ? "تم طلب رابط التأكيد في صندوق الاختبار المحلي. إرسال البريد الخارجي غير متصل بعد، ولن يصل إلى بريدك الشخصي."
            : "Confirmation requested in the local test inbox. External email delivery is not connected yet, so this will not arrive in your personal inbox.",
        reset_local:
          locale === "ar"
            ? "روابط استعادة الحساب تُرسل حاليًا إلى صندوق الاختبار المحلي فقط."
            : "Recovery links currently go to the local test inbox only.",
      }[state.message]
    : confirmationError
      ? locale === "ar"
        ? "رابط التأكيد غير صالح أو انتهت صلاحيته أو تم استخدامه. لو أكدت بريدك بالفعل، سجّل دخولك."
        : "This confirmation link is invalid, expired or already used. If you already confirmed your email, sign in."
      : !configured
        ? t.authUnavailable
        : null;
  return (
    <form action={action} className="auth-form">
      <h2>{title}</h2>
      <p>{mode === "register" ? t.registerText : mode === "reset" ? t.resetText : t.loginText}</p>
      {localMail && ["register", "resend", "reset"].includes(mode) && (
        <p className="notice">
          {locale === "ar"
            ? "نسخة تجريبية: إرسال البريد الخارجي غير متصل. الرسائل تصل لصندوق الاختبار المحلي فقط."
            : "Development preview: external email delivery is not connected. Messages go to the local test inbox only."}
        </p>
      )}
      {message && (
        <div
          role="status"
          className={`notice ${state.message === "error" || confirmationError ? "error" : ""}`}
        >
          {message}
        </div>
      )}
      <input type="hidden" name="next" value={next} />
      {mode === "register" && (
        <div className="field">
          <label htmlFor="full_name">{t.name}</label>
          <Input
            id="full_name"
            name="full_name"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
            disabled={!configured}
          />
        </div>
      )}
      {mode !== "update" && (
        <div className="field">
          <label htmlFor="email">{t.email}</label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            disabled={!configured}
          />
        </div>
      )}
      {mode !== "reset" && mode !== "resend" && (
        <div className="field">
          <label htmlFor="password">{t.password}</label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={10}
            maxLength={128}
            required
            disabled={!configured}
          />
          <span className="field-hint">
            {locale === "ar" ? "10 أحرف على الأقل" : "At least 10 characters"}
          </span>
        </div>
      )}
      <Button type="submit" disabled={pending || !configured}>
        {pending ? t.saving : label}
      </Button>
      <div className="auth-links">
        {mode === "login" ? (
          <>
            <Link href={`/${locale}/auth?mode=register`}>
              {t.noAccount} {t.register}
            </Link>
            <Link href={`/${locale}/auth?mode=reset`}>{t.forgot}</Link>
            <Link href={`/${locale}/auth?mode=resend`}>
              {locale === "ar" ? "إعادة إرسال تأكيد البريد" : "Resend confirmation"}
            </Link>
          </>
        ) : (
          <Link href={`/${locale}/auth?mode=login`}>
            {t.hasAccount} {t.login}
          </Link>
        )}
      </div>
    </form>
  );
}
