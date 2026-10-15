import type { CategorySlug, Locale } from "./domain";

export const pcFields = [
  "CPU",
  "Motherboard",
  "RAM",
  "Storage",
  "PSU",
  "Case",
  "Cooling",
  "Graphics",
  "Boot status",
  "Included accessories",
] as const;
export const laptopFields = [
  "CPU",
  "Graphics",
  "RAM",
  "Storage",
  "Display",
  "Battery condition",
  "Charger",
  "Keyboard layout",
  "Boot status",
  "Included accessories",
] as const;

export function requiredHardwareFields(category: CategorySlug): readonly string[] {
  return category === "pc-builds" ? pcFields : category === "laptops" ? laptopFields : [];
}

const arabic: Record<string, string> = {
  CPU: "المعالج",
  Motherboard: "اللوحة الأم",
  RAM: "الرام",
  Storage: "التخزين",
  PSU: "مزود الطاقة والموديل والقدرة",
  Case: "الكيسة",
  Cooling: "التبريد",
  Graphics: "كارت الشاشة أو الرسوميات المدمجة",
  Display: "الشاشة",
  "Battery condition": "حالة البطارية",
  Charger: "الشاحن",
  "Keyboard layout": "لغة وتخطيط لوحة المفاتيح",
  "Boot status": "حالة التشغيل",
  "Included accessories": "الملحقات المشمولة",
};

export function specificationLabel(key: string, locale: Locale) {
  return locale === "ar" ? arabic[key] || key : key;
}

const laptopHints: Record<string, [string, string]> = {
  CPU: [
    "Full processor model, including its suffix.",
    "موديل المعالج بالكامل، بما فيه الحروف في آخر اسمه.",
  ],
  Graphics: [
    "Laptop GPU model and VRAM, or integrated graphics. Add GPU power (W) if known.",
    "موديل كارت اللابتوب وسعة ذاكرته أو الرسوميات المدمجة. أضف قدرة الكارت بالوات إن كانت معروفة.",
  ],
  RAM: [
    "Installed capacity; speed and upgradeable slots if known.",
    "السعة المركبة، والسرعة وفتحات الترقية إن كانت معروفة.",
  ],
  Storage: [
    "Drive type and capacity, such as SSD and its size.",
    "نوع وحدة التخزين وسعتها، مثل SSD وسعته.",
  ],
  Display: [
    "Screen size, resolution and refresh rate; disclose any dead pixels or damage.",
    "حجم الشاشة ودقتها ومعدل التحديث، مع ذكر أي بكسلات تالفة أو ضرر.",
  ],
  "Battery condition": [
    "Report measured health or runtime and the test date. If untested, write Not tested; disclose if missing or faulty.",
    "اذكر الصحة أو مدة التشغيل المقاسة وتاريخ الاختبار. إن لم تختبرها اكتب لم تُختبر، ووضّح إن كانت مفقودة أو تالفة.",
  ],
  Charger: [
    "Included or missing; original or replacement; wattage if known.",
    "موجود أو غير موجود، أصلي أو بديل، وقدرته بالوات إن كانت معروفة.",
  ],
  "Keyboard layout": [
    "Keyboard language/layout, backlight if present, and any faulty keys.",
    "لغة وتخطيط لوحة المفاتيح، والإضاءة إن وجدت، وأي أزرار معطلة.",
  ],
  "Boot status": [
    "Whether it starts normally, needs repair, or has not been tested.",
    "هل يعمل بشكل طبيعي أم يحتاج إصلاحًا أم لم يُختبر.",
  ],
  "Included accessories": [
    "List what comes with the laptop, or write None.",
    "اذكر ما يشمله الإعلان من ملحقات، أو اكتب لا يوجد.",
  ],
};

export function laptopFieldHint(key: string, locale: Locale) {
  return laptopHints[key]?.[locale === "ar" ? 1 : 0];
}
