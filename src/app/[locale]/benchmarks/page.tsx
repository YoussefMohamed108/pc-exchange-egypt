import { publicPageMetadata } from "@/lib/site-metadata";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { BenchmarkExplorer } from "@/components/benchmark-explorer";
import "./benchmarks.css";
import "./gaming.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return publicPageMetadata(
    locale,
    "/benchmarks",
    locale === "ar" ? "مكتبة اختبارات الأداء" : "Hardware benchmark library",
  );
}
export default async function Benchmarks({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { view } = await searchParams;
  return <BenchmarkExplorer locale={locale} view={view === "gaming" ? "gaming" : "reference"} />;
}
