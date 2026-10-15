"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Plus, Check, X, Cpu, CircuitBoard, HardDrive } from "lucide-react";
import type { Locale } from "@/lib/domain";
import { GamingBenchmarkExplorer } from "@/components/gaming-benchmark-explorer";
import {
  gamingGames,
  gamingModelIds,
  gamingMeasurementCount,
  gamingSnapshotDate,
} from "@/lib/gaming-benchmarks";
import {
  benchmarkSnapshotDate,
  benchmarkSources,
  referenceBenchmarks,
  selectBenchmarks,
  type BenchmarkKind,
} from "@/lib/reference-benchmarks";

export function BenchmarkExplorer({
  locale,
  view = "reference",
}: {
  locale: Locale;
  view?: "reference" | "gaming";
}) {
  const ar = locale === "ar";
  const gaming = view === "gaming";
  const [kind, setKind] = useState<BenchmarkKind>("gpu");
  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState<"score" | "writeScore">("score");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const rows = selectBenchmarks(kind, query, metric);
  const compared = referenceBenchmarks.filter((row) => selected.includes(row.id));
  const max = Math.max(...selectBenchmarks(kind, "", metric).map((row) => row[metric] ?? 0));
  const number = (value: number) =>
    new Intl.NumberFormat(ar ? "ar-EG" : "en-GB", {
      maximumFractionDigits: kind === "ssd" ? 3 : 2,
    }).format(value);
  const date = (value: string) =>
    new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  const metricName =
    kind === "ssd"
      ? metric === "score"
        ? ar
          ? "القراءة"
          : "Read"
        : ar
          ? "الكتابة"
          : "Write"
      : ar
        ? "الوسيط"
        : "Median score";
  const unit = kind === "ssd" ? "GB/s" : ar ? "عينة/دقيقة" : "samples/min";
  function switchKind(next: BenchmarkKind) {
    setKind(next);
    setMetric("score");
    setQuery("");
    setPage(0);
    setSelected([]);
  }
  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  }
  return (
    <div className="bench-page container">
      <section className="bench-intro">
        <div>
          <div className="bench-kicker">
            PCX / {ar ? "مرجع الأداء" : "PERFORMANCE INDEX"} <span>№ 01</span>
          </div>
          <h1>
            {ar ? (
              <>
                اعرف القوة.
                <br />
                <em>قبل الشراء.</em>
              </>
            ) : (
              <>
                Know the power.
                <br />
                <em>Before the purchase.</em>
              </>
            )}
          </h1>
          <p>
            {ar
              ? "اختبارات حقيقية للمعالجات وكروت الشاشة ووحدات التخزين. استكشف النتائج، قارن المكونات، وارجع للمصدر."
              : "Real measurements for processors, graphics cards and storage. Explore the numbers, compare hardware, follow the evidence."}
          </p>
          <a href="#benchmark-results" className="bench-jump">
            {ar ? "استكشف النتائج" : "Explore the results"} <ArrowUpRight size={20} />
          </a>
        </div>
        <aside className="bench-index-card">
          <div className="bench-card-top">
            <span>
              {gaming
                ? ar
                  ? "مكتبة اختبارات الألعاب"
                  : "GAMING PERFORMANCE"
                : ar
                  ? "مكتبة مرجعية"
                  : "REFERENCE LIBRARY"}
            </span>
            <CircuitBoard size={24} />
          </div>
          <strong>
            {gaming ? gamingMeasurementCount : referenceBenchmarks.length}
            <span>
              {gaming
                ? ar
                  ? "قياس أداء ألعاب"
                  : "gaming measurements"
                : ar
                  ? "نتيجة موثقة المصدر"
                  : "sourced results"}
            </span>
          </strong>
          <div className="bench-index-stripes" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <dl>
            {gaming ? (
              <>
                <div>
                  <dt>{ar ? "ألعاب" : "GAMES"}</dt>
                  <dd>{Object.keys(gamingGames).length}</dd>
                </div>
                <div>
                  <dt dir="ltr">GPU / CPU</dt>
                  <dd dir="ltr">
                    {gamingModelIds("gpu").length} / {gamingModelIds("cpu").length}
                  </dd>
                </div>
                <div>
                  <dt>{ar ? "دقات" : "RESOLUTIONS"}</dt>
                  <dd>3</dd>
                </div>
              </>
            ) : (
              (["gpu", "cpu", "ssd"] as const).map((type) => (
                <div key={type}>
                  <dt>{type.toUpperCase()}</dt>
                  <dd>{referenceBenchmarks.filter((row) => row.kind === type).length}</dd>
                </div>
              ))
            )}
          </dl>
          <small>
            {ar ? "تاريخ جمع البيانات" : "Data collected"} ·{" "}
            {date(gaming ? gamingSnapshotDate : benchmarkSnapshotDate)}
          </small>
        </aside>
      </section>
      <nav className="bench-view-switch" aria-label={ar ? "نوع الاختبار" : "Benchmark type"}>
        <Link href={`/${locale}/benchmarks`} aria-current={!gaming ? "page" : undefined}>
          <span>01</span>
          {ar ? "الرندر والتخزين" : "Rendering & storage"}
          <small>CPU · GPU · SSD</small>
        </Link>
        <Link href={`/${locale}/benchmarks?view=gaming`} aria-current={gaming ? "page" : undefined}>
          <span>02</span>
          {ar ? "أداء الألعاب" : "Gaming FPS"}
          <small>1080p · 1440p · 4K</small>
        </Link>
      </nav>
      {gaming ? (
        <GamingBenchmarkExplorer locale={locale} />
      ) : (
        <section
          id="benchmark-results"
          className="bench-workspace"
          aria-label={ar ? "نتائج اختبارات الأداء" : "Benchmark results"}
        >
          <div
            className="bench-category-switch"
            aria-label={ar ? "نوع المكونات" : "Hardware category"}
          >
            {(
              [
                { id: "gpu", label: ar ? "كروت الشاشة" : "Graphics", Icon: CircuitBoard },
                { id: "cpu", label: ar ? "المعالجات" : "Processors", Icon: Cpu },
                { id: "ssd", label: ar ? "وحدات التخزين" : "Storage", Icon: HardDrive },
              ] as const
            ).map(({ id, label, Icon }, index) => (
              <button key={id} aria-pressed={kind === id} onClick={() => switchKind(id)}>
                <span>0{index + 1}</span>
                <Icon size={22} />
                <strong>{label}</strong>
                <small>{id.toUpperCase()}</small>
              </button>
            ))}
          </div>
          <div className="bench-method">
            <div>
              <span className="bench-kicker">{ar ? "الاختبار المستخدم" : "THE MEASUREMENT"}</span>
              <h2>{kind === "ssd" ? "Blackmagic Disk Speed Test" : "Blender 4.5.0"}</h2>
            </div>
            <p>
              {kind === "ssd"
                ? ar
                  ? "سرعات قراءة وكتابة من مراجعات StorageReview. تختلف سعة القرص ومنصة الاختبار بين المراجعات؛ النتائج مرجع تقريبي وليست اختبارًا موحدًا للأقراص. لا تقيس زمن تحميل الألعاب أو الكتابة المستمرة."
                  : "Read and write measurements from StorageReview. Capacities and review platforms vary; these are reference results, not a controlled head-to-head. They do not measure game loading or sustained writes."
                : ar
                  ? "وسيط نتائج الرندر من مجتمع Blender، مع عدد الاختبارات لكل موديل. كل النتائج للإصدار 4.5.0. تختلف الأجهزة والتعريفات والإعدادات؛ هذه الدرجات لا تمثل FPS الألعاب."
                  : "Community rendering medians with submission counts, all using version 4.5.0. Systems, drivers and settings vary. These scores do not represent gaming FPS."}
              {kind === "gpu" && (
                <small>
                  {ar
                    ? "النتائج مجمعة حسب اسم الجهاز وتشمل OPTIX وCUDA وHIP وMETAL وONEAPI. قد يجمع الاسم أكثر من سعة ذاكرة أو إعداد."
                    : "Grouped by device name across OPTIX, CUDA, HIP, METAL and ONEAPI. A name may cover multiple memory capacities or configurations."}
                </small>
              )}
              {kind === "cpu" && (
                <small>
                  {ar
                    ? "تتضمن القائمة المجموعات التي تحتوي على 10 اختبارات على الأقل. الأسماء المتطابقة بعد إزالة المسافات تستخدم المجموعة الأكبر فقط."
                    : "Included groups have at least 10 submissions. Where names differ only by whitespace, the largest group is retained; medians are never pooled."}
                </small>
              )}
            </p>
          </div>
          <div className="bench-toolbar">
            <label className="bench-search">
              <Search size={19} />
              <span className="sr-only">{ar ? "ابحث عن موديل" : "Search benchmark models"}</span>
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={
                  kind === "gpu"
                    ? "RTX 3060, RX 6600…"
                    : kind === "cpu"
                      ? "Ryzen 5600, i5-12400F…"
                      : "Samsung, Kingston…"
                }
              />
            </label>
            {kind === "ssd" && (
              <label className="bench-sort">
                {ar ? "ترتيب حسب" : "Sort by"}
                <select
                  value={metric}
                  onChange={(e) => {
                    setMetric(e.target.value as typeof metric);
                    setPage(0);
                  }}
                >
                  <option value="score">{ar ? "القراءة" : "Read speed"}</option>
                  <option value="writeScore">{ar ? "الكتابة" : "Write speed"}</option>
                </select>
              </label>
            )}
            <span role="status">
              {rows.length} {ar ? "نتيجة" : "results"}
            </span>
          </div>
          <div className="bench-comparison">
            <div className="bench-compare-heading">
              <h3>
                {ar ? "طاولة المقارنة" : "Your comparison bench"} <span>{selected.length}/3</span>
              </h3>
              {selected.length > 0 && (
                <button onClick={() => setSelected([])}>
                  {ar ? "مسح" : "Clear"} <X size={14} />
                </button>
              )}
            </div>
            {compared.length === 0 ? (
              <p>
                {ar
                  ? "اضغط + بجوار أي موديل لمقارنة حتى 3 مكونات من نفس الفئة."
                  : "Tap + beside a model to compare up to 3 parts in this category."}
              </p>
            ) : (
              <div className="bench-compare-grid">
                {compared.map((row) => (
                  <article key={row.id}>
                    <button
                      aria-label={`${ar ? "إزالة" : "Remove"} ${row.model}`}
                      onClick={() => toggle(row.id)}
                    >
                      <X size={16} />
                    </button>
                    <small>{row.test}</small>
                    <h4 dir="ltr">{row.model}</h4>
                    <strong>
                      {number(row[metric] ?? 0)} <span>{unit}</span>
                    </strong>
                    <div className="bench-meter">
                      <i style={{ width: `${((row[metric] ?? 0) / max) * 100}%` }} />
                    </div>
                    <small>
                      {metricName} · {ar ? "الأعلى أفضل" : "Higher is better"}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="bench-table-heading">
            <span>{ar ? "الموديل والمصدر" : "MODEL / SOURCE"}</span>
            <span>
              {metricName} · {unit} ↑
            </span>
          </div>
          <div className="bench-rows">
            {rows.slice(page * 15, page * 15 + 15).map((row, index) => {
              const source = benchmarkSources[row.sourceId];
              return (
                <article className="bench-row" key={row.id}>
                  <span className="bench-rank">
                    {String(page * 15 + index + 1).padStart(2, "0")}
                  </span>
                  <div className="bench-model">
                    <h3 dir="ltr">{row.model}</h3>
                    <div>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.name} <ArrowUpRight size={12} />
                      </a>
                      <span> · {date(row.sourceDate)}</span>
                    </div>
                    <small>
                      {row.samples
                        ? `${number(row.samples)} ${ar ? "اختبارًا مجتمعيًا" : "community submissions"}`
                        : row.note}
                    </small>
                  </div>
                  <div className="bench-score">
                    <strong>
                      {number(row[metric] ?? 0)} <small>{unit}</small>
                    </strong>
                    <div className="bench-meter" aria-hidden="true">
                      <i style={{ width: `${((row[metric] ?? 0) / max) * 100}%` }} />
                    </div>
                    {kind === "ssd" && (
                      <small>
                        {metric === "score" ? (ar ? "الكتابة" : "Write") : ar ? "القراءة" : "Read"}:{" "}
                        {number((metric === "score" ? row.writeScore : row.score) ?? 0)} GB/s
                      </small>
                    )}
                  </div>
                  <button
                    className="bench-add"
                    aria-label={`${selected.includes(row.id) ? (ar ? "إزالة" : "Remove") : ar ? "مقارنة" : "Compare"} ${row.model}`}
                    aria-pressed={selected.includes(row.id)}
                    disabled={selected.length === 3 && !selected.includes(row.id)}
                    onClick={() => toggle(row.id)}
                  >
                    {selected.includes(row.id) ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                </article>
              );
            })}
            {rows.length === 0 && (
              <div className="bench-empty">
                <Search size={28} />
                <h3>{ar ? "لا توجد نتائج لهذا الموديل" : "No result for that model"}</h3>
                <p>
                  {ar
                    ? "جرّب اسمًا أقصر. المكتبة تضم نتائج مختارة فقط."
                    : "Try a shorter name. This library contains selected results only."}
                </p>
                <button onClick={() => setQuery("")}>{ar ? "مسح البحث" : "Clear search"}</button>
              </div>
            )}
          </div>
          {rows.length > 15 && (
            <nav className="bench-pagination" aria-label={ar ? "صفحات النتائج" : "Results pages"}>
              <button disabled={page === 0} onClick={() => setPage(page - 1)}>
                {ar ? "السابق" : "Previous"}
              </button>
              <span>
                {page + 1} / {Math.ceil(rows.length / 15)}
              </span>
              <button disabled={(page + 1) * 15 >= rows.length} onClick={() => setPage(page + 1)}>
                {ar ? "التالي" : "Next"}
              </button>
            </nav>
          )}
        </section>
      )}
      <section className="bench-footnotes">
        <div>
          <span className="bench-kicker">01 / {ar ? "افهم النتيجة" : "READ THE RESULT"}</span>
          <h2>{ar ? "المرجع بداية المقارنة." : "A reference, not the whole story."}</h2>
          <p>
            {ar
              ? "النتائج المنشورة لا تثبت حالة القطعة المعروضة للبيع. راجع ملف اختبارات البائع وافحص القطعة قبل الشراء. علامة تمت مراجعة الاختبارات تخص أدلة الإعلان فقط."
              : "Published results cannot establish the condition of an individual listing. Check the seller’s evidence and inspect the hardware. The Benchmark reviewed label applies only to that listing’s submitted evidence."}
          </p>
          <Link href={`/${locale}/verification`}>
            {ar ? "كيف نراجع أدلة البائع" : "How seller evidence is reviewed"}{" "}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          <span className="bench-kicker">02 / {ar ? "المصادر والمنهج" : "SOURCES & METHOD"}</span>
          {gaming ? (
            <p>
              {ar
                ? "قياسات مختارة من مراجعات TechSpot، مع رابط المراجعة ورسم المصدر. المقارنة متاحة داخل نفس الاختبار فقط؛ لا نجمع نتائج مراجعات مختلفة في ترتيب واحد ولا نستنتج FPS من درجات Blender."
                : "Selected measurements from TechSpot reviews, linked to the article and source chart. Comparisons stay within one test series. Different reviews never share a ranking, and Blender scores are never converted into FPS."}
            </p>
          ) : (
            <>
              <p>
                {ar
                  ? "بيانات CPU وGPU من Blender Open Data برخصة CC0، والتحديث هنا لقطة محفوظة وليست بيانات مباشرة. أرقام SSD مختارة من اختبارات الناشر وليست مواصفات الشركة المصنعة. تعرض الأعمدة مقياسًا ثابتًا داخل الفئة."
                  : "CPU and GPU data comes from Blender Open Data under CC0. This is a dated snapshot, not a live feed. SSD numbers are selected measured results, not manufacturer specifications. Bars use a fixed scale within each category."}
              </p>
              <a href="https://opendata.blender.org/about/" target="_blank" rel="noreferrer">
                Blender Open Data — {ar ? "المنهج والرخصة" : "method & license"}{" "}
                <ArrowUpRight size={16} />
              </a>
            </>
          )}
          <p className="bench-small">
            {ar
              ? "لا نعيد نشر المقالات أو رسوم الناشر. افتح رابط المصدر بجوار الموديل للاطلاع على ظروف الاختبار كاملة."
              : "Articles and publisher charts are not reproduced. Open each model’s source for the full test conditions."}
          </p>
        </div>
      </section>
    </div>
  );
}
