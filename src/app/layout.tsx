import type { Metadata } from "next";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { CartProvider } from "@/components/cart-provider";
import localFont from "next/font/local";
import "./globals.css";
import "./storefront.css";
const displayFont = localFont({
  src: "../../node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2",
  variable: "--font-archivo",
  display: "swap",
  weight: "100 900",
});
const bodyFont = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  display: "swap",
  weight: "200 800",
});
const arabicFont = localFont({
  src: "../../node_modules/@fontsource-variable/cairo/files/cairo-arabic-wght-normal.woff2",
  variable: "--font-arabic",
  display: "swap",
  weight: "200 1000",
  preload: false,
});
export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
  title: { default: "PC Exchange Egypt — Upgrade smarter", template: "%s | PC Exchange Egypt" },
  description:
    "A new home for used PC hardware in Egypt. Discover components, understand their condition, and upgrade smarter.",
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await headers()).get("x-app-locale") === "ar" ? "ar" : "en";
  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${displayFont.variable} ${bodyFont.variable} ${arabicFont.variable}`}
    >
      <body>
        <CartProvider>
          {children}
          <Toaster
            theme="light"
            position={locale === "ar" ? "bottom-left" : "bottom-right"}
            richColors
          />
        </CartProvider>
      </body>
    </html>
  );
}
