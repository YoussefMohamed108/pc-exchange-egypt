import { publicPageMetadata } from "@/lib/site-metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ArrowRight, Plus, Monitor, Keyboard, Computer, Laptop } from "lucide-react";
import { isLocale } from "@/lib/domain";
import { dictionary } from "@/lib/i18n";
import { catalogFiltersSchema } from "@/lib/validation";
import { getCatalog } from "@/lib/catalog";
import { PcExplorer } from "@/components/pc-explorer";
import { ProductCard } from "@/components/product-card";
import styles from "./page.module.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return publicPageMetadata(
    locale,
    "/",
    locale === "ar" ? "قطع كمبيوتر مستعملة في مصر" : "Used PC hardware in Egypt",
  );
}
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === "ar",
    t = dictionary(locale);
  const catalog = await getCatalog(catalogFiltersSchema.parse({ available: "true" }));
  const outside = [
    {
      slug: "laptops",
      Icon: Laptop,
      title: ar ? "خد إمكانياتك معاك." : "Take it with you.",
      name: ar ? "لابتوبات" : "Laptops",
    },
    {
      slug: "monitors",
      Icon: Monitor,
      title: ar ? "صورة أكبر." : "A bigger picture.",
      name: ar ? "الشاشات" : "Monitors",
    },
    {
      slug: "peripherals",
      Icon: Keyboard,
      title: ar ? "لمستك الخاصة." : "Make it yours.",
      name: ar ? "الملحقات" : "Peripherals",
    },
    {
      slug: "pc-builds",
      Icon: Computer,
      title: ar ? "التجميعة كاملة." : "The whole setup.",
      name: ar ? "تجميعات الكمبيوتر" : "Complete PCs",
    },
  ];
  return (
    <div className={styles.home}>
      <section className={`container ${styles.hero}`}>
        <div className={styles.intro}>
          <div className={styles.kicker}>
            <span />
            {ar ? "مكونات لها مستقبل. من مصر." : "SECOND-LIFE HARDWARE. FIRST-CLASS POSSIBILITIES."}
          </div>
          <h1>
            {ar ? (
              <>
                حياة جديدة.
                <br />
                لتجميعتك
                <br />
                <em>الجايّة.</em>
              </>
            ) : (
              <>
                A new life.
                <br />
                For your
                <br />
                <em>next build.</em>
              </>
            )}
          </h1>
          <p>
            {ar
              ? "المكونات الكويسة تستاهل فرصة تانية. اكتشف القطعة اللي هتفرق في تجميعتك، واعرف حالتها قبل ما تختار."
              : "Good hardware deserves another round. Find the part that moves your build forward, with its condition out in the open."}
          </p>
          <Link className={styles.primary} href={`/${locale}/catalog`}>
            {ar ? "اكتشف المكونات" : "Find your next part"}
            <ArrowUpRight size={22} />
          </Link>
          <Link className={styles.completePcLink} href={`/${locale}/catalog?category=pc-builds`}>
            <Computer size={19} aria-hidden="true" />
            {ar ? "عايز جهاز كامل؟" : "Looking for a complete PC?"}
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <div className={styles.sideNote}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path
                d="M24 2V46M2 24H46M8 8L40 40M8 40L40 8"
                stroke="currentColor"
                strokeWidth="4"
              />
            </svg>
            <span>
              {ar
                ? "أداء ليك.\nفرصة تانية للمكونات."
                : "More life in your hardware.\nMore possibility in your PC."}
            </span>
          </div>
        </div>
        <PcExplorer locale={locale} />
      </section>

      <div className={styles.manifesto} aria-label={ar ? "مبادئنا" : "Our approach"}>
        <div>
          <span>{ar ? "حالة واضحة" : "KNOW THE CONDITION"}</span>
          <Plus />
          <span>{ar ? "اقرأ تقرير الفحص" : "READ THE INSPECTION"}</span>
          <Plus />
          <span>{ar ? "اختار ترقيتك" : "MAKE YOUR NEXT MOVE"}</span>
          <ArrowUpRight />
        </div>
      </div>

      <section className={`container ${styles.beyond}`} aria-labelledby="beyond-heading">
        <div className={styles.sectionLead}>
          <span className={styles.chapter}>01 / {ar ? "كمّل الصورة" : "BEYOND THE CASE"}</span>
          <h2 id="beyond-heading">
            {ar ? "على مكتبك. أو في شنطتك." : "On your desk. Or on the move."}
          </h2>
        </div>
        <div className={styles.outsideGrid}>
          {outside.map(({ slug, Icon, title, name }, i) => (
            <Link
              key={slug}
              href={`/${locale}/catalog?category=${slug}`}
              className={styles.outsideItem}
              data-tone={i}
            >
              <div className={styles.outsideTop}>
                <span>{name}</span>
                <ArrowUpRight size={21} />
              </div>
              <Icon className={styles.outsideArt} strokeWidth={0.8} />
              <h3>{title}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className={`container ${styles.collection}`}>
        <div className={styles.collectionHead}>
          <div>
            <span className={styles.chapter}>02 / {ar ? "على الرف" : "ON THE SHELF"}</span>
            <h2>{ar ? "قطع جاهزة\nلبداية جديدة." : "Ready for\na second act."}</h2>
          </div>
          <Link href={`/${locale}/catalog`}>
            {ar ? "كل المكونات" : "See all hardware"}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        {catalog.products.length ? (
          <div className="product-grid">
            {catalog.products.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyShelf}>
            <div className={styles.shelfArt} aria-hidden="true">
              <span />
              <span />
              <span />
              <i />
            </div>
            <div>
              <span className={styles.smallLabel}>
                {catalog.state === "error"
                  ? ar
                    ? "غير متاح مؤقتاً"
                    : "TEMPORARILY UNAVAILABLE"
                  : ar
                    ? "قريباً على الرف"
                    : "A LITTLE ROOM FOR WHAT’S NEXT"}
              </span>
              <h3>
                {catalog.state === "error"
                  ? t.queryError
                  : ar
                    ? "بنجهّز الدفعة الجايّة."
                    : "The next drop is taking shape."}
              </h3>
              <p>
                {catalog.state === "error"
                  ? t.queryErrorText
                  : ar
                    ? "مفيش قطع منشورة حالياً. أول ما المكونات تكون جاهزة، هتلاقيها هنا بحالتها وسعرها الفعلي."
                    : "No hardware is listed yet. When the collection is ready, you’ll find the real parts, conditions and prices right here."}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className={styles.stories}>
        <div className={styles.inspectionStory}>
          <span className={styles.chapter}>
            03 / {ar ? "اعرف اللي بتشتريه" : "GOOD PARTS. NO GUESSWORK."}
          </span>
          <h2>{ar ? "الوضوح\nجزء من الصفقة." : "The details\nmake the deal."}</h2>
          <p>
            {ar
              ? "الفحص له تفاصيل وحدود. اعرف إيه اللي اتجرّب، وإمتى، وإيه العيوب المعروفة قبل ما تقرر."
              : "A verification badge should tell a story. What was tested. When it was tested. And what you should know before you buy."}
          </p>
          <div className={styles.gradeRow}>
            {["A", "B", "C", "D"].map((grade, i) => (
              <div key={grade}>
                <strong>{grade}</strong>
                <span>{[t.gradeA, t.gradeB, t.gradeC, t.gradeD][i]}</span>
              </div>
            ))}
          </div>
          <Link href={`/${locale}/verification`}>
            {ar ? "اقرأ دليل الفحص" : "Get to know our inspection process"}
            <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className={styles.tradeStory}>
          <div className={styles.tradeTop}>
            <span className={styles.chapter}>
              {ar ? "للمكونات فرصة تانية" : "KEEP GOOD HARDWARE GOING"}
            </span>
            <span className={styles.coming}>{ar ? "قيد التطوير" : "IN DEVELOPMENT"}</span>
          </div>
          <h2>{ar ? "كمّل\nالدائرة." : "PASS\nIT ON."}</h2>
          <svg className={styles.loopArt} viewBox="0 0 200 200" aria-hidden="true">
            <path
              d="M54 36A75 75 0 0 1 170 126M146 104L171 129L190 103M146 164A75 75 0 0 1 30 74M54 96L29 71L10 97"
              fill="none"
              stroke="currentColor"
              strokeWidth="9"
            />
          </svg>
          <p>
            {ar
              ? "تجميعتك القديمة ممكن تكون بداية حد تاني. بنجهز طريقة أبسط للتقييم والاستبدال."
              : "Your old build could be someone’s new beginning. A simpler way to trade in and exchange is in the works."}
          </p>
          <Link href={`/${locale}/trade-in`}>
            {ar ? "إيه اللي جاي؟" : "See what’s coming"}
            <ArrowRight size={19} className="rtl-arrow" />
          </Link>
        </div>
      </section>
      <div className={`container ${styles.closing}`}>
        <span>PC EXCHANGE</span>
        <p>
          {ar ? "مكونات مستعملة. احتمالات جديدة." : "PRE-OWNED PARTS. OPEN-ENDED POSSIBILITIES."}
        </p>
      </div>
    </div>
  );
}
