import { notFound } from "next/navigation";
import { ShieldCheck, ClipboardCheck, ScanLine, FileCheck } from "lucide-react";
import { isLocale } from "@/lib/domain";
import { dictionary } from "@/lib/i18n";
export const metadata = { title: "Hardware verification" };
export default async function Verification({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionary(locale),
    steps = [
      { Icon: ClipboardCheck, title: t.process1, text: t.process1Text },
      { Icon: ScanLine, title: t.process2, text: t.process2Text },
      { Icon: FileCheck, title: t.process3, text: t.process3Text },
    ];
  return (
    <div className="container content-section">
      <div className="feature-page" style={{ paddingBlock: 20, minHeight: 0 }}>
        <ShieldCheck />
        <div className="eyebrow">{t.processEyebrow}</div>
        <h1>{t.processTitle}</h1>
        <p>{t.reportScopeNote}</p>
      </div>
      <div className="process-grid">
        {steps.map(({ Icon, title, text }, i) => (
          <div className="process-card" key={title}>
            <div className="process-top">
              <span>0{i + 1}</span>
              <Icon />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <section className="panel" style={{ marginTop: 35 }}>
        <h2>
          {locale === "ar"
            ? "فحص ميداني من PCX — مجاني حاليًا"
            : "PCX Inspected — free during launch"}
        </h2>
        <p>
          {locale === "ar"
            ? "بعد نشر الإعلان، يمكن للبائع طلب فحص مجاني من صفحة إدارة إعلانه. يتواصل الأدمن لتأكيد إمكانية الفحص والموعد. لا توجد رسوم أو خطوة دفع حاليًا."
            : "After publishing, sellers can request a free physical inspection from their listing dashboard. An admin confirms availability and arranges a visit. There is no fee or payment step during launch."}
        </p>
        <p>
          {locale === "ar"
            ? "تُمنح علامة PCX Inspected بعد فحص الجهاز فعليًا، وتوثيق هويته وصوره ونتائج الاختبارات المناسبة لفئته، ونجاح جميع الاختبارات المطلوبة. تفتح العلامة تقريرًا مؤرخًا. تنتهي صلاحيتها بعد 90 يومًا وتبطل عند تغيير تفاصيل الجهاز. يمكن للإدارة سحبها. لا تمثل ضمانًا."
            : "PCX Inspected is awarded after an actual visit, recorded device identity, visit photos, and passing every required category-specific check. Buyers can open the dated report. It lasts 90 days, becomes invalid when hardware details change, and can be revoked by admins. It does not include a warranty."}
        </p>
      </section>
      <section className="panel" style={{ marginTop: 35 }}>
        <h2>{locale === "ar" ? "مراجعة اختبارات البائع" : "Seller benchmark review"}</h2>
        <p>
          {locale === "ar"
            ? "يمكن للبائع نشر إعلانه مباشرة. رفع ملف PDF للاختبارات اختياري، ويستطيع أي مستخدم مسجل مشاهدة الملف قبل المراجعة وبعدها."
            : "Sellers can publish immediately. A benchmark PDF is optional, and any signed-in user can view it before and after review."}
        </p>
        <p>
          {locale === "ar"
            ? "علامة تمت مراجعة الاختبارات تعني أن أدمن راجع الأدلة المرسلة لهذه المكونات. تستمر المراجعة 90 يومًا، وتحتاج لتجديد عند تغيير تفاصيل المكونات أو الأدلة. هذا لا يثبت الملكية أو الحالة الفعلية ولا يمنح ضمانًا."
            : "Benchmark reviewed means an admin reviewed the submitted evidence for that hardware. Reviews last 90 days and need renewal when hardware details or evidence change. This does not establish ownership, physical condition or a warranty."}
        </p>
      </section>
      <section className="panel" style={{ marginTop: 35 }}>
        <h2>{t.condition}</h2>
        <dl className="spec-list">
          {(["A", "B", "C", "D"] as const).map((g) => (
            <div style={{ display: "contents" }} key={g}>
              <dt>
                {t.grade} {g}
              </dt>
              <dd>{t[`grade${g}`]}</dd>
            </div>
          ))}
        </dl>
        <p style={{ marginTop: 20 }}>
          {locale === "ar"
            ? "تحدد الدرجة من الفحص الموثق: ممتاز دون عيوب وظيفية أو أضرار ظاهرة؛ جيد مع آثار استخدام خفيفة؛ مقبول مع آثار استخدام واضحة وعيوب معلنة؛ ودرجة D للأجزاء المعطلة أو قطع الغيار. الدرجة وحدها لا تعني اكتمال الفحص."
            : "Grades follow documented inspection: A has no functional defects or visible damage; B has light cosmetic wear; C has visible wear and disclosed limitations; D is defective or for parts. A condition grade alone does not mean an item has been inspected."}
        </p>
      </section>
    </div>
  );
}
