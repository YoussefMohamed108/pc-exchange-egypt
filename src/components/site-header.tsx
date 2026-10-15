"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, ShoppingBag, Menu, X, ArrowUpRight, Globe2 } from "lucide-react";
import { Brand } from "./brand";
import { dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/domain";
import { useCart } from "./cart-provider";
export function SiteHeader({ locale, signedIn }: { locale: Locale; signedIn: boolean }) {
  const t = dictionary(locale),
    path = usePathname(),
    params = useSearchParams(),
    cart = useCart();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "catalog", label: t.shop },
    { href: "account/listings/new", label: locale === "ar" ? "بيع مكوناتك" : "Sell hardware" },
    { href: "verification", label: t.verification },
    { href: "benchmarks", label: locale === "ar" ? "الأداء" : "Benchmarks" },
  ];
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const other = locale === "en" ? "ar" : "en";
  const languagePath =
    path.replace(/^\/(en|ar)(?=\/|$)/, `/${other}`) + (params.toString() ? `?${params}` : "");
  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>{t.heroSmall}</span>
          <span>
            <span className="status-dot" />
            {t.heroArtTag}
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-main">
          <Link href={`/${locale}`} aria-label="PC Exchange Egypt">
            <Brand />
          </Link>
          <nav
            className="desktop-nav"
            aria-label={locale === "ar" ? "القائمة الرئيسية" : "Main navigation"}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={`/${locale}/${l.href}`}
                className={path.includes(l.href) ? "active" : ""}
              >
                {l.label}
                {l.href === "trade-in" && <ArrowUpRight size={12} />}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <a className="locale-switch" href={languagePath}>
              <Globe2 size={15} />
              {t.language}
            </a>
            <span className="nav-divider" />
            <Link className="account-link" href={`/${locale}/${signedIn ? "account" : "auth"}`}>
              {signedIn ? t.account : t.signIn}
            </Link>
            <Link
              className="cart-link"
              href={`/${locale}/cart`}
              aria-label={`${t.cart} (${cart.count})`}
            >
              <ShoppingBag size={20} />
              {cart.count > 0 && <span className="cart-count">{cart.count}</span>}
            </Link>
            <button
              type="button"
              className="mobile-menu button button-ghost button-icon"
              aria-label={open ? t.close : t.menu}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-navigation" className="mobile-navigation">
            {[
              ...links,
              { href: signedIn ? "account" : "auth", label: signedIn ? t.account : t.signIn },
            ].map((l) => (
              <Link key={l.href} href={`/${locale}/${l.href}`} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <div className="search-strip">
        <div className="container search-row">
          <form action={`/${locale}/catalog`} className="global-search">
            <Search size={18} />
            <input
              type="search"
              name="q"
              placeholder={t.search}
              aria-label={t.searchLabel}
              defaultValue={params.get("q") || ""}
            />
            <button type="submit" aria-label={t.searchLabel}>
              <ArrowUpRight size={19} />
            </button>
          </form>
          <Link href={`/${locale}/catalog?verified=true`} className="search-quick-link">
            <span className="mini-shield">✓</span>
            {t.reviewedHardware}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </>
  );
}
