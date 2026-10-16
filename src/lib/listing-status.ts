import type { Locale } from "./domain";
const labels: Record<string, [string, string]> = {
  pending_review: ["Pending publication review", "بانتظار مراجعة النشر"],
  listed: ["Published", "منشور"],
  draft: ["Draft", "مسودة"],
  paused: ["Paused", "متوقف مؤقتًا"],
  sold: ["Sold", "تم البيع"],
  archived: ["Archived", "مؤرشف"],
};
export function sellerStatusLabel(status: string, locale: Locale) {
  return labels[status]?.[locale === "ar" ? 1 : 0] || status;
}

const reviewLabels: Record<string, [string, string]> = {
  draft: ["Not submitted", "لم يُرسل للمراجعة"],
  pending: ["Pending review", "بانتظار المراجعة"],
  approved: ["Publication approved", "تمت الموافقة على النشر"],
  changes_requested: ["Changes requested", "تعديلات مطلوبة"],
  rejected: ["Publication refused", "رُفض النشر"],
};
export function listingReviewLabel(status: string, locale: Locale) {
  return reviewLabels[status]?.[locale === "ar" ? 1 : 0] || status;
}
