import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, Mail } from "lucide-react";
import { isLocale } from "@/lib/domain";
import { createSupabaseClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/validation";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Email confirmation", robots: { index: false, follow: false } };

export default async function VerifiedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === "ar";
  const client = await createSupabaseClient();
  const result = client ? await client.auth.getUser() : null;
  const verified = !result?.error && !!result?.data.user?.email_confirmed_at;
  const requestedNext = safeReturnPath((await searchParams).next, locale);
  const destination = requestedNext.startsWith(`/${locale}/auth/verified`)
    ? `/${locale}/account`
    : requestedNext;
  const Icon = verified ? CircleCheck : Mail;
  return (
    <section className="container feature-page confirmation-page">
      <Icon aria-hidden="true" />
      <div className="eyebrow">{ar ? "حسابك في PC Exchange" : "YOUR PC EXCHANGE ACCOUNT"}</div>
      <h1>
        {verified
          ? ar
            ? "تم تأكيد الحساب."
            : "Account verified."
          : ar
            ? "لم يكتمل التأكيد بعد."
            : "Verification not completed yet."}
      </h1>
      <p>
        {verified
          ? ar
            ? "تم تأكيد بريدك الإلكتروني وتسجيل دخولك بأمان. تقدر تكمل لحسابك."
            : "Your email address is confirmed and you’re securely signed in. You can now continue to your account."
          : ar
            ? "افتح رابط التأكيد اللي وصلك على بريدك. لو أكدت حسابك في متصفح تاني، سجّل دخولك هنا."
            : "Open the confirmation link from your email. If you already verified in another browser, sign in here."}
      </p>
      <Button asChild>
        <Link href={verified ? destination : `/${locale}/auth?mode=login`}>
          {verified ? (ar ? "متابعة" : "Continue") : ar ? "تسجيل الدخول" : "Sign in"}
        </Link>
      </Button>
    </section>
  );
}
