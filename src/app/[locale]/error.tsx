"use client";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { dictionary } from "@/lib/i18n";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { locale } = useParams(),
    t = dictionary(locale === "ar" ? "ar" : "en");
  return (
    <div className="container content-section">
      <EmptyState title={t.errorTitle} description={t.errorText}>
        <Button onClick={reset}>{t.retry}</Button>
      </EmptyState>
    </div>
  );
}
