import type { CategorySlug, Locale } from "./domain";

export const pcParts = [
  {
    id: "gpu",
    category: "graphics-cards",
    en: "Graphics card",
    ar: "كارت الشاشة",
    code: "GPU",
    color: "#eb633b",
  },
  {
    id: "cpu",
    category: "processors",
    en: "Processor",
    ar: "المعالج",
    code: "CPU",
    color: "#b4a2d0",
  },
  { id: "ram", category: "memory", en: "Memory", ar: "الذاكرة", code: "RAM", color: "#c4cf72" },
  {
    id: "motherboard",
    category: "motherboards",
    en: "Motherboard",
    ar: "اللوحة الأم",
    code: "MB",
    color: "#548076",
  },
  {
    id: "storage",
    category: "storage",
    en: "Storage",
    ar: "التخزين",
    code: "SSD",
    color: "#d7a54d",
  },
  {
    id: "cooling",
    category: "cooling",
    en: "Cooling",
    ar: "التبريد",
    code: "FAN",
    color: "#8aa8b0",
  },
  {
    id: "power",
    category: "power-supplies",
    en: "Power supply",
    ar: "مزود الطاقة",
    code: "PSU",
    color: "#505653",
  },
  { id: "case", category: "cases", en: "Cases", ar: "الصناديق", code: "CASE", color: "#b9b5a8" },
] as const satisfies ReadonlyArray<{
  id: string;
  category: CategorySlug;
  en: string;
  ar: string;
  code: string;
  color: string;
}>;
export type PcPartId = (typeof pcParts)[number]["id"];
export const partById = (id: PcPartId) => pcParts.find((part) => part.id === id)!;
export const partHref = (id: PcPartId, locale: Locale) =>
  `/${locale}/catalog?category=${partById(id).category}`;
