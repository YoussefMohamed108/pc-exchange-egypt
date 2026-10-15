import type { CategorySlug, Locale } from "./domain";

export const checkLabels: Record<string, [string, string]> = {
  identity: ["Device identity matches the listing", "تطابق هوية الجهاز مع الإعلان"],
  physical_condition: ["Physical condition and damage", "الحالة الظاهرية والأضرار"],
  functional_test: ["Normal operation", "التشغيل العادي"],
  load_stability: ["Stability under load", "الاستقرار تحت الضغط"],
  temperatures: ["Temperatures under load", "الحرارة تحت الضغط"],
  display_outputs: ["Display outputs", "مخارج الصورة"],
  memory_test: ["Memory test", "اختبار الذاكرة"],
  drive_health: ["Drive health / SMART", "صحة التخزين / SMART"],
  read_write_test: ["Read / write test", "اختبار القراءة والكتابة"],
  boot: ["Boot and component detection", "الإقلاع والتعرف على المكونات"],
  slots_ports: ["Slots and ports", "المنافذ والشقوق"],
  connectors: ["Power connectors", "وصلات الطاقة"],
  fan_pump: ["Fans / pump", "المراوح والمضخة"],
  display: ["Display and pixels", "الشاشة والبكسلات"],
  controls_ports: ["Controls and connections", "الأزرار والتوصيلات"],
  mounts_ports: ["Mounts and front ports", "أماكن التثبيت والمنافذ الأمامية"],
  battery: ["Battery health and charging", "صحة البطارية والشحن"],
  keyboard_ports: ["Keyboard, touchpad and ports", "لوحة المفاتيح والتاتش باد والمنافذ"],
  charger: ["Charger condition and rating", "حالة الشاحن وقدرته"],
  category_specific_test: ["Category-specific test", "اختبار مناسب لفئة المنتج"],
};
export function inspectionChecklist(category: CategorySlug) {
  const extra: Partial<Record<CategorySlug, string[]>> = {
    "graphics-cards": ["load_stability", "temperatures", "display_outputs"],
    processors: ["load_stability", "temperatures"],
    memory: ["memory_test"],
    storage: ["drive_health", "read_write_test"],
    motherboards: ["boot", "slots_ports"],
    "power-supplies": ["load_stability", "connectors"],
    cooling: ["temperatures", "fan_pump"],
    monitors: ["display", "display_outputs"],
    peripherals: ["controls_ports"],
    cases: ["mounts_ports"],
    "pc-builds": [
      "boot",
      "load_stability",
      "temperatures",
      "memory_test",
      "drive_health",
      "slots_ports",
    ],
    laptops: [
      "boot",
      "load_stability",
      "temperatures",
      "memory_test",
      "drive_health",
      "battery",
      "display",
      "keyboard_ports",
      "charger",
    ],
  };
  return [
    "identity",
    "physical_condition",
    "functional_test",
    ...(extra[category] || ["category_specific_test"]),
  ];
}
export const checkLabel = (key: string, locale: Locale) =>
  checkLabels[key]?.[locale === "ar" ? 1 : 0] || key;
export type InspectionRequest = {
  id: string;
  listing_id: string;
  revision: number;
  status: "requested" | "scheduled" | "completed" | "declined" | "cancelled";
  availability_note: string;
  admin_note: string;
  scheduled_at: string | null;
  created_at: string;
  fee_piastres: number;
};
export const requestStatus = (status: InspectionRequest["status"], locale: Locale) =>
  locale === "ar"
    ? {
        requested: "تم الطلب",
        scheduled: "تم تحديد موعد",
        completed: "مكتمل",
        declined: "تعذر قبول الطلب",
        cancelled: "ملغي",
      }[status]
    : {
        requested: "Requested",
        scheduled: "Scheduled",
        completed: "Completed",
        declined: "Declined",
        cancelled: "Cancelled",
      }[status];
export type FieldReport = {
  id: string;
  listing_id: string;
  product_title: string;
  reference_code: string;
  category_slug: CategorySlug;
  inspected_on: string;
  identity_description: string;
  findings: string;
  known_defects: string;
  checks: Record<string, { result: "pass" | "fail" | "not_tested"; notes: string }>;
  photo_paths: string[];
  outcome: "passed" | "failed" | "incomplete";
  expires_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  current_revision: boolean;
  latest_report: boolean;
  unexpired: boolean;
};
