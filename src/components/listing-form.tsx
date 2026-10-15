"use client";
import { useActionState, useState } from "react";
import type { Locale } from "@/lib/domain";
import type { MarketplaceState } from "@/lib/action-state";
import { ActionResult } from "./ui/action-result";
import { localizedText as text } from "@/lib/i18n";
import { Button } from "./ui/button";
import Image from "next/image";
import { categorySlugs } from "@/lib/domain";
import { categoryName, dictionary } from "@/lib/i18n";
import type { SellerListing } from "@/lib/marketplace-validation";
import {
  requiredHardwareFields,
  specificationLabel,
  laptopFieldHint,
} from "@/lib/hardware-specifications";
import { saveListing, saveAdminListing, uploadSellerPhoto } from "@/app/actions/marketplace";
import { Input, Select, Textarea } from "./ui/input";
export function ListingForm({
  locale,
  listing,
  governorate,
  adminMode = false,
}: {
  locale: Locale;
  listing?: SellerListing;
  governorate: string;
  adminMode?: boolean;
}) {
  const [state, action, pending] = useActionState(
    (adminMode ? saveAdminListing : saveListing).bind(null, locale),
    {} as MarketplaceState,
  );
  const [category, setCategory] = useState(listing?.category_slug || "graphics-cards");
  const [specs, setSpecs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(listing?.specifications || {}).map(([k, v]) => [k, String(v)]),
    ),
  );
  const [rows, setRows] = useState(() =>
    Object.entries(listing?.specifications || {})
      .map(([k, v]) => [k, String(v)])
      .concat([["", ""]]),
  );
  const [paths, setPaths] = useState<string[]>(listing?.image_paths || []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const t = dictionary(locale);
  const requiredFields = requiredHardwareFields(category);
  const resolved = requiredFields.length
    ? Object.fromEntries(requiredFields.map((k) => [k, specs[k] || ""]))
    : Object.fromEntries(rows.filter(([k, v]) => k.trim() && v.trim()));
  return (
    <form action={action} className="market-form">
      <ActionResult state={state} locale={locale} />
      {listing && (
        <>
          <input type="hidden" name="id" value={listing.id} />
          <input type="hidden" name="expected_updated_at" value={listing.updated_at} />
        </>
      )}
      <input type="hidden" name="specifications" value={JSON.stringify(resolved)} />
      <input type="hidden" name="image_paths" value={JSON.stringify(paths)} />
      <div className="field">
        <label htmlFor="title">{t.name}</label>
        <Input
          id="title"
          name="title"
          required
          minLength={5}
          maxLength={150}
          defaultValue={listing?.title}
        />
      </div>
      <div className="field">
        <label htmlFor="category_slug">{t.category}</label>
        <Select
          id="category_slug"
          name="category_slug"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          {categorySlugs.map((c) => (
            <option key={c} value={c}>
              {categoryName(c, locale)}
            </option>
          ))}
        </Select>
      </div>
      <div className="market-fields">
        {[
          ["brand", t.brand, listing?.brand, 60],
          ["model", text(locale, "Model", "الموديل"), listing?.model, 100],
          [
            "price",
            text(locale, "Asking price (EGP)", "السعر المطلوب بالجنيه"),
            listing ? String(listing.price_piastres / 100) : "",
            20,
          ],
          ["governorate", t.location, listing?.governorate || governorate, 60],
        ].map(([name, label, value, max]) => (
          <div className="field" key={String(name)}>
            <label htmlFor={String(name)}>{label}</label>
            <Input
              id={String(name)}
              name={String(name)}
              defaultValue={value}
              required
              maxLength={Number(max)}
              inputMode={name === "price" ? "decimal" : undefined}
            />
          </div>
        ))}
      </div>
      <div className="field">
        <label htmlFor="condition">{t.condition}</label>
        <Select id="condition" name="condition" defaultValue={listing?.condition || "B"}>
          {(["A", "B", "C", "D"] as const).map((c) => (
            <option key={c} value={c}>
              {c} — {t[`grade${c}`]}
            </option>
          ))}
        </Select>
        <span className="field-hint">
          {text(
            locale,
            "Condition is your description; it is not an inspection grade from the platform.",
            "الحالة حسب وصفك، وليست تقييم فحص من المنصة.",
          )}
        </span>
      </div>
      <div className="field">
        <label htmlFor="description">{text(locale, "Description", "الوصف")}</label>
        <Textarea
          id="description"
          name="description"
          minLength={15}
          maxLength={5000}
          required
          defaultValue={listing?.description}
        />
      </div>
      <div className="field">
        <label htmlFor="known_defects">
          {text(
            locale,
            "Known defects (write None if there are none)",
            "العيوب المعروفة (اكتب لا يوجد إن لم توجد عيوب)",
          )}
        </label>
        <Textarea
          id="known_defects"
          name="known_defects"
          minLength={2}
          maxLength={2000}
          required
          defaultValue={listing?.known_defects}
        />
      </div>
      <fieldset>
        <legend>{text(locale, "Hardware details", "تفاصيل المكونات")}</legend>
        {category === "laptops" && (
          <p>
            {text(
              locale,
              "Describe this exact laptop configuration. These details are seller-reported. State when a condition detail is unknown or not tested; do not guess battery health.",
              "صف مواصفات هذا اللابتوب بالتحديد. هذه البيانات حسب وصف البائع. وضّح إن كانت حالة أي جزء غير معروفة أو لم تُختبر، ولا تخمّن صحة البطارية.",
            )}
          </p>
        )}
        {requiredFields.length ? (
          <div className="market-fields">
            {requiredFields.map((k) => (
              <div className="field" key={k}>
                <label htmlFor={`spec-${k}`}>{specificationLabel(k, locale)}</label>
                <Input
                  id={`spec-${k}`}
                  aria-describedby={
                    category === "laptops" ? `hint-${k.replaceAll(" ", "-")}` : undefined
                  }
                  value={specs[k] || ""}
                  onChange={(e) => setSpecs({ ...specs, [k]: e.target.value })}
                  maxLength={500}
                  required
                  placeholder={
                    k === "Graphics"
                      ? text(
                          locale,
                          "GPU model or integrated graphics",
                          "موديل الكارت أو رسوميات مدمجة",
                        )
                      : undefined
                  }
                />
                {category === "laptops" && (
                  <span className="field-hint" id={`hint-${k.replaceAll(" ", "-")}`}>
                    {laptopFieldHint(k, locale)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            {rows.map(([key, value], i) => (
              <div className="market-fields" key={i}>
                <Input
                  aria-label={text(locale, `Specification ${i + 1}`, `المواصفة ${i + 1}`)}
                  placeholder={text(
                    locale,
                    "Specification, e.g. VRAM",
                    "المواصفة، مثل سعة الذاكرة",
                  )}
                  maxLength={60}
                  value={key}
                  onChange={(e) =>
                    setRows(rows.map((r, n) => (n === i ? [e.target.value, r[1]] : r)))
                  }
                />
                <Input
                  aria-label={text(locale, `Value ${i + 1}`, `القيمة ${i + 1}`)}
                  placeholder={text(locale, "Value, e.g. 8 GB", "القيمة، مثل 8 جيجابايت")}
                  maxLength={500}
                  value={value}
                  onChange={(e) =>
                    setRows(rows.map((r, n) => (n === i ? [r[0], e.target.value] : r)))
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={rows.length >= 30}
              onClick={() => setRows([...rows, ["", ""]])}
            >
              {text(locale, "Add specification", "إضافة مواصفة")}
            </Button>
          </>
        )}
      </fieldset>
      <fieldset>
        <legend>{text(locale, "Product photos", "صور المنتج")}</legend>
        <p>
          {text(
            locale,
            "Add at least one real photo to publish. Up to 8 photos, 3 MB each.",
            "أضف صورة حقيقية واحدة على الأقل للنشر. حتى 8 صور، 3 ميجابايت لكل صورة.",
          )}
        </p>
        <div className="seller-photos">
          {paths.map((path, i) => (
            <div key={path}>
              <Image
                unoptimized
                width={160}
                height={120}
                alt={text(locale, `Product photo ${i + 1}`, `صورة المنتج ${i + 1}`)}
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/marketplace-images/${path}`}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPaths(paths.filter((p) => p !== path))}
              >
                {text(locale, "Remove", "إزالة")}
              </Button>
            </div>
          ))}
        </div>
        <Input
          type="file"
          aria-label={text(locale, "Upload product photo", "رفع صورة المنتج")}
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading || paths.length >= 8}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            setUploadError(false);
            try {
              const f = new FormData();
              f.set("photo", file);
              const r = await uploadSellerPhoto(locale, f);
              if (r.path) setPaths((p) => [...p, r.path!]);
              else setUploadError(true);
            } catch {
              setUploadError(true);
            } finally {
              setUploading(false);
              e.target.value = "";
            }
          }}
        />
        {uploading && <p role="status">{text(locale, "Uploading photo…", "جاري رفع الصورة…")}</p>}
        {uploadError && (
          <p role="alert">
            {text(
              locale,
              "Could not upload. Use a JPEG, PNG or WebP under 3 MB.",
              "تعذر الرفع. استخدم JPEG أو PNG أو WebP أقل من 3 ميجابايت.",
            )}
          </p>
        )}
      </fieldset>
      <div className="field">
        <label htmlFor="status">{text(locale, "Listing status", "حالة الإعلان")}</label>
        <Select id="status" name="status" defaultValue={listing?.status || "listed"}>
          {[
            ["listed", "Publish now", "انشر الآن"],
            ["draft", "Save draft", "حفظ مسودة"],
            ["paused", "Paused", "متوقف مؤقتًا"],
            ["sold", "Sold", "تم البيع"],
            ["archived", "Archived", "مؤرشف"],
          ].map(([value, en, ar]) => (
            <option key={value} value={value}>
              {text(locale, en, ar)}
            </option>
          ))}
        </Select>
      </div>
      <p>
        {text(
          locale,
          "Your listing can go live immediately. The Benchmark reviewed watermark is added only after an admin approves your optional PDF evidence.",
          "تقدر تنشر إعلانك مباشرة. علامة تمت مراجعة الاختبارات تظهر فقط بعد موافقة الأدمن على ملف الأدلة الاختياري.",
        )}
      </p>
      <Button disabled={pending || uploading}>
        {text(
          locale,
          pending ? "Saving…" : "Save listing",
          pending ? "جاري الحفظ…" : "حفظ الإعلان",
        )}
      </Button>
    </form>
  );
}
