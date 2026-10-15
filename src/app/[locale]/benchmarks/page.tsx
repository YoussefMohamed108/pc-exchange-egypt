import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { BenchmarkExplorer } from "@/components/benchmark-explorer";
import "./benchmarks.css";
import "./gaming.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "مكتبة اختبارات الأداء" : "Hardware benchmark library",
    description:
      "Compare sourced GPU and CPU gaming FPS at 1080p, 1440p and 4K, plus rendering and SSD measurements.",
  };
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
