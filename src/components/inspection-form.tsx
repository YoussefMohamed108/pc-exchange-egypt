"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { publishInspection } from "@/app/actions/inventory";
import type { Locale } from "@/lib/domain";
import { dictionary } from "@/lib/i18n";
import { Input, Textarea, Select } from "./ui/input";
import { Button } from "./ui/button";
export function InspectionForm({
  locale,
  products,
  selectedProduct,
}: {
  locale: Locale;
  products: { id: string; title: string; reference_code?: string }[];
  selectedProduct?: string;
}) {
  const t = dictionary(locale),
    router = useRouter(),
    [pending, startTransition] = useTransition(),
    [error, setError] = useState(false);
  return (
    <form
      className="form-panel"
      action={(form) =>
        startTransition(async () => {
          setError(false);
          const input = { ...Object.fromEntries(form), valid_days: Number(form.get("valid_days")) };
          try {
            const result = await publishInspection(locale, input);
            if (result.error) {
              setError(true);
              return;
            }
            toast.success(t.reportSaved);
            router.refresh();
          } catch {
            setError(true);
          }
        })
      }
    >
      {error && (
        <div className="notice error" role="alert">
          {t.saveFailed}
        </div>
      )}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="product_id">{t.product}</label>
          <Select id="product_id" name="product_id" required defaultValue={selectedProduct}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.reference_code} · {p.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label htmlFor="inspection_condition">{t.condition}</label>
          <Select id="inspection_condition" name="condition">
            {(["A", "B", "C", "D"] as const).map((g) => (
              <option key={g} value={g}>
                {g} — {t[`grade${g}`]}
              </option>
            ))}
          </Select>
        </div>
        {[
          ["scope", t.inspectionScope],
          ["findings", t.findings],
          ["known_defects", t.defects],
          ["tests", t.testResults],
        ].map(([name, label]) => (
          <div className="field wide" key={name}>
            <label htmlFor={name}>{label}</label>
            <Textarea
              id={name}
              name={name}
              required={name !== "known_defects"}
              minLength={name === "scope" || name === "findings" ? 10 : undefined}
              defaultValue={name === "tests" ? "{}" : undefined}
              dir={name === "tests" ? "ltr" : undefined}
            />
          </div>
        ))}
        <div className="field">
          <label htmlFor="outcome">{t.outcome}</label>
          <Select id="outcome" name="outcome">
            <option value="passed">{t.passed}</option>
            <option value="failed">{t.failed}</option>
          </Select>
        </div>
        <div className="field">
          <label htmlFor="valid_days">{t.validity}</label>
          <Input
            id="valid_days"
            type="number"
            name="valid_days"
            min={1}
            max={180}
            defaultValue={30}
            required
          />
        </div>
      </div>
      <div className="notice">{t.reportScopeNote}</div>
      <div className="form-actions">
        <Button type="submit" disabled={pending || !products.length}>
          {pending ? t.saving : t.publishReport}
        </Button>
      </div>
    </form>
  );
}
