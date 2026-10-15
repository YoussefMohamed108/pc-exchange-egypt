import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
import { dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/domain";
export function SiteFooter({ locale }: { locale: Locale }) {
  const t = dictionary(locale);
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div>
            <Link href={`/${locale}`}>
              <Brand />
            </Link>
            <p>{t.footerText}</p>
          </div>
          <div className="footer-column">
            <h3>{t.footerShop}</h3>
            <Link href={`/${locale}/catalog`}>{t.allHardware}</Link>
            <Link href={`/${locale}/catalog?verified=true`}>{t.reviewedHardware}</Link>
            <Link href={`/${locale}/trade-in`}>{t.trade}</Link>
          </div>
          <div className="footer-column">
            <h3>{t.footerLearn}</h3>
            <Link href={`/${locale}/verification`}>{t.verification}</Link>
            <Link href={`/${locale}/benchmarks`}>
              {locale === "ar" ? "مكتبة الأداء" : "Benchmark library"}
            </Link>
            <Link href={`/${locale}/price-estimator`}>{t.pricing}</Link>
          </div>
          <div className="footer-column">
            <h3>{t.footerAccount}</h3>
            <Link href={`/${locale}/account`}>{t.account}</Link>
            <Link href={`/${locale}/cart`}>{t.cart}</Link>
            <Link href={`/${locale}/auth?mode=register`}>
              {t.register}
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {t.footerRights}
          </span>
          <span>
            <span className="status-dot" />
            {t.footerStatus}
          </span>
          <span>
            {t.footerMade}
            <span className="egypt-flag">
              <i />
              <i />
              <i />
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}
