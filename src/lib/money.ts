import type { Locale } from "./domain";
export function egpToPiastres(value: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value))
    throw new Error("Enter a valid EGP amount with up to two decimals.");
  const [whole, fraction = ""] = value.split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (result > 2_000_000_000n) throw new Error("Amount exceeds the supported limit.");
  return Number(result);
}
export function formatMoney(piastres: number, locale: Locale = "en") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: piastres % 100 ? 2 : 0,
  }).format(piastres / 100);
}
export function priceInput(piastres: number) {
  return `${Math.floor(piastres / 100)}.${String(piastres % 100).padStart(2, "0")}`;
}
