"use client";
import { useActionState } from "react";
import type { Locale } from "@/lib/domain";
import type { MarketplaceState } from "@/lib/action-state";
import { ActionResult } from "./ui/action-result";
import { localizedText as text } from "@/lib/i18n";
import { Button } from "./ui/button";
import { saveProfile } from "@/app/actions/marketplace";
import type { ContactProfile } from "@/lib/marketplace-validation";
import { Input } from "./ui/input";
export function ContactForm({
  locale,
  profile,
  name,
}: {
  locale: Locale;
  profile: ContactProfile | null;
  name: string;
}) {
  const [state, action, pending] = useActionState(
    saveProfile.bind(null, locale),
    {} as MarketplaceState,
  );
  return (
    <form action={action} className="market-form">
      <ActionResult state={state} locale={locale} />
      <p>
        {text(
          locale,
          "Choose how buyers can reach you. These details are shown only to signed-in users viewing your published listings.",
          "اختار وسيلة تواصل للمشترين. البيانات دي بتظهر فقط للمستخدمين المسجلين عند عرض إعلاناتك المنشورة.",
        )}
      </p>
      <div className="field">
        <label htmlFor="display_name">{text(locale, "Display name", "الاسم الظاهر")}</label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile?.display_name || name}
          minLength={2}
          maxLength={100}
          required
          autoComplete="name"
        />
      </div>
      <div className="field">
        <label htmlFor="governorate">{text(locale, "Governorate", "المحافظة")}</label>
        <Input
          id="governorate"
          name="governorate"
          defaultValue={profile?.governorate}
          minLength={2}
          maxLength={60}
          required
          autoComplete="address-level1"
        />
      </div>
      <div className="field">
        <label htmlFor="phone">
          {text(locale, "Egyptian mobile / WhatsApp", "رقم موبايل مصري / واتساب")}
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile?.phone}
          placeholder="01012345678"
          autoComplete="tel"
        />
      </div>
      <div className="field">
        <label htmlFor="social_url">{text(locale, "Social contact link", "رابط التواصل")}</label>
        <Input
          id="social_url"
          name="social_url"
          type="url"
          defaultValue={profile?.social_url}
          placeholder="https://t.me/username"
          maxLength={300}
        />
        <span className="field-hint">
          {text(
            locale,
            "Add at least one contact method. Supported links: Facebook, Instagram, Telegram, WhatsApp and Messenger.",
            "أضف وسيلة واحدة على الأقل. الروابط المتاحة: فيسبوك وإنستجرام وتليجرام وواتساب وماسنجر.",
          )}
        </span>
      </div>
      <Button disabled={pending}>
        {text(
          locale,
          pending ? "Saving…" : "Save contact details",
          pending ? "جاري الحفظ…" : "حفظ بيانات التواصل",
        )}
      </Button>
    </form>
  );
}
