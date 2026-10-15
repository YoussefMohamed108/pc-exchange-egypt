import type { Locale } from "./domain";
const labels: Record<string, [string, string]> = {
  listed: ["Published", "منشور"],
  draft: ["Draft", "مسودة"],
  paused: ["Paused", "متوقف مؤقتًا"],
  sold: ["Sold", "تم البيع"],
  archived: ["Archived", "مؤرشف"],
};
export function sellerStatusLabel(status: string, locale: Locale) {
  return labels[status]?.[locale === "ar" ? 1 : 0] || status;
}
