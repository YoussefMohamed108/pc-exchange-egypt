"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { inventorySchema, type InventoryInput } from "@/lib/validation";
import { categorySlugs, type Locale } from "@/lib/domain";
import { dictionary, categoryName } from "@/lib/i18n";
import { saveInventory } from "@/app/actions/inventory";
import { uploadProductPhoto } from "@/app/actions/uploads";
import { Input, Textarea, Select } from "./ui/input";
import { Button } from "./ui/button";
export function InventoryForm({ locale, initial }: { locale: Locale; initial?: InventoryInput }) {
  const t = dictionary(locale),
    router = useRouter(),
    [pending, startTransition] = useTransition(),
    [error, setError] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<InventoryInput, unknown, z.output<typeof inventorySchema>>({
    resolver: zodResolver(inventorySchema),
    defaultValues: initial || {
      title: "",
      title_ar: "",
      category_slug: "graphics-cards",
      brand: "",
      model: "",
      description: "",
      description_ar: "",
      condition: "B",
      price: "",
      purchase_cost: "",
      sku: "",
      quantity: 1,
      warranty_months: 0,
      governorate: "Cairo",
      status: "draft",
      specifications: "{}",
      image_paths: "",
    },
  });
  const fields: [keyof InventoryInput, string, string?][] = [
    ["title", t.product],
    ["title_ar", t.arabicTitle],
    ["brand", t.brand],
    ["model", t.model],
    ["sku", t.sku],
    ["governorate", t.location],
    ["price", t.price, "decimal"],
    ["purchase_cost", t.cost, "decimal"],
    ["quantity", t.stock, "number"],
    ["warranty_months", t.warrantyMonths, "number"],
  ];
  const onSubmit = (validated: z.output<typeof inventorySchema>) => {
    startTransition(async () => {
      try {
        const data = {
          ...validated,
          specifications: JSON.stringify(validated.specifications),
          image_paths: validated.image_paths.join("\n"),
        };
        const result = await saveInventory(locale, data);
        if (result.error) {
          setError(true);
          toast.error(t.saveFailed);
          return;
        }
        toast.success(t.saved);
        router.push(`/${locale}/admin`);
        router.refresh();
      } catch {
        setError(true);
        toast.error(t.saveFailed);
      }
    });
  };
  return (
    <form id="inventory-form" className="form-panel" onSubmit={handleSubmit(onSubmit)}>
      {error && (
        <div className="notice error" role="alert">
          {t.saveFailed}
        </div>
      )}
      <div className="form-grid">
        {fields.map(([key, label, kind]) => (
          <div className="field" key={key}>
            <label htmlFor={key}>{label}</label>
            <Input
              id={key}
              {...register(key, { valueAsNumber: kind === "number" })}
              type={kind === "number" ? "number" : "text"}
              inputMode={kind === "decimal" ? "decimal" : undefined}
              min={key === "quantity" ? (initial ? 0 : 1) : 0}
              max={key === "quantity" ? 1000 : key === "warranty_months" ? 60 : undefined}
              aria-invalid={!!errors[key]}
            />
            {errors[key] && (
              <span className="field-error" role="alert">
                {String(errors[key]?.message)}
              </span>
            )}
          </div>
        ))}
        <div className="field">
          <label htmlFor="category_slug">{t.category}</label>
          <Select id="category_slug" {...register("category_slug")}>
            {categorySlugs.map((s) => (
              <option key={s} value={s}>
                {categoryName(s, locale)}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label htmlFor="condition">{t.condition}</label>
          <Select id="condition" {...register("condition")}>
            {(["A", "B", "C", "D"] as const).map((g) => (
              <option value={g} key={g}>
                {g} — {t[`grade${g}`]}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label htmlFor="status">{t.status}</label>
          <Select id="status" {...register("status")}>
            <option value="draft">{t.draft}</option>
            <option value="listed">{t.listed}</option>
            <option value="archived">{t.archived}</option>
          </Select>
        </div>
        {[
          ["description", t.description],
          ["description_ar", t.arabicDescription],
          ["specifications", t.specsJson],
          ["image_paths", t.imagePaths],
        ].map(([key, label]) => (
          <div className="field wide" key={key}>
            <label htmlFor={key}>{label}</label>
            <Textarea
              id={key}
              {...register(key as keyof InventoryInput)}
              dir={key === "specifications" || key === "image_paths" ? "ltr" : undefined}
              aria-invalid={!!errors[key as keyof InventoryInput]}
            />
            {errors[key as keyof InventoryInput] && (
              <span className="field-error">
                {String(errors[key as keyof InventoryInput]?.message)}
              </span>
            )}
            {key === "image_paths" && <p className="field-hint">{t.publishedImages}</p>}
          </div>
        ))}
        <div className="field wide">
          <label htmlFor="photo-upload">
            {locale === "ar" ? "إضافة صورة للمنتج" : "Add a product photo"}
          </label>
          <Input
            id="photo-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const paths = getValues("image_paths").split("\n").filter(Boolean);
              if (paths.length >= 8) {
                toast.error(locale === "ar" ? "8 صور كحد أقصى" : "Maximum 8 photos");
                return;
              }
              const form = new FormData();
              form.set("photo", file);
              startTransition(async () => {
                try {
                  const result = await uploadProductPhoto(locale, form);
                  if (result.error || !result.path) {
                    toast.error(
                      locale === "ar"
                        ? "تعذر رفع الصورة. استخدم JPEG أو PNG أو WebP أقل من 5 ميجابايت."
                        : "Could not upload. Use a JPEG, PNG or WebP photo smaller than 5 MB.",
                    );
                    return;
                  }
                  setValue("image_paths", [...paths, result.path].join("\n"), {
                    shouldValidate: true,
                  });
                  toast.success(locale === "ar" ? "تم رفع الصورة" : "Photo uploaded");
                } catch {
                  toast.error(t.saveFailed);
                }
              });
            }}
          />
          <p className="field-hint">
            {locale === "ar"
              ? "حتى 8 صور، 5 ميجابايت للصورة. تتم إزالة بيانات الموقع والبيانات الوصفية."
              : "Up to 8 photos, 5 MB each. Location and embedded metadata are removed."}
          </p>
        </div>
      </div>
      <div className="form-actions">
        <Button asChild variant="ghost">
          <Link href={`/${locale}/admin`}>{t.inventory}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
