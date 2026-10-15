"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Plus, Search, X, Gamepad2 } from "lucide-react";
import type { Locale } from "@/lib/domain";
import {
  gamingGames,
  gamingFamilies,
  gamingFamily,
  gamingModelIds,
  gamingModels,
  gamingResolutions,
  gamingSources,
  gamingTestsFor,
  selectGamingResults,
  type GamingKind,
  type GamingResolution,
} from "@/lib/gaming-benchmarks";

export function GamingBenchmarkExplorer({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [kind, setKind] = useState<GamingKind>("gpu");
  const [gameId, setGameId] = useState("marvel");
  const [sourceId, setSourceId] = useState("scaling");
  const [resolution, setResolution] = useState<GamingResolution>("1080p");
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [modelId, setModelId] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const matchingTests = gamingTestsFor(kind, undefined, family, modelId);
  const activeGame = matchingTests.some((item) => item.gameId === gameId)
    ? gameId
    : matchingTests[0].gameId;
  const availableTests = matchingTests.filter((item) => item.gameId === activeGame);
  const test = availableTests.find((item) => item.sourceId === sourceId) ?? availableTests[0];
  const source = gamingSources[test.sourceId];
  const games = Object.entries(gamingGames).filter(([id]) =>
    matchingTests.some((item) => item.gameId === id),
  );
  const matchesHardware = (id: string) =>
    (family === "all" || gamingFamily(id) === family) && (modelId === "all" || id === modelId);
  const seriesRows = selectGamingResults(test.id, kind, resolution);
  const allRows = seriesRows.filter((row) => matchesHardware(row.modelId));
  const seriesModelCount = seriesRows.filter((row) => row.average !== undefined).length;
  const rows = selectGamingResults(test.id, kind, resolution, query).filter(
    (row) => matchesHardware(row.modelId) && row.average !== undefined,
  );
  const resolutionAvailable = allRows.some((row) => row.average !== undefined);
  const chart = test.charts[gamingResolutions.indexOf(resolution)];
  const families = Object.entries(gamingFamilies).filter(([id]) => gamingModelIds(kind, id).length);
  const compared = allRows.filter((row) => selected.includes(row.modelId));
  const max = Math.max(1, ...allRows.map((row) => row.average ?? 0));
  const fixedHardware = kind === "gpu" ? source.gpuTestCpu : source.cpuTestGpu;
  const number = (value: number | undefined) =>
    value === undefined ? "—" : new Intl.NumberFormat(ar ? "ar-EG" : "en-GB").format(value);
  const date = new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${source.publishedAt}T00:00:00Z`));
  function resetComparison() {
    setSelected([]);
    setQuery("");
  }
  function changeKind(next: GamingKind) {
    changeHardware(next, "all", "all");
  }
  function changeHardware(nextKind: GamingKind, nextFamily: string, nextModel: string) {
    const candidates = gamingTestsFor(nextKind, undefined, nextFamily, nextModel);
    const count = (id: string) =>
      selectGamingResults(id, nextKind, "1080p").filter(
        (row) =>
          (nextFamily === "all" || gamingFamily(row.modelId) === nextFamily) &&
          (nextModel === "all" || row.modelId === nextModel),
      ).length;
    // Keep the visible review when broadening a filter. If the game is unavailable,
    // start with the review covering the most matching hardware, not the first entry.
    const nextTest =
      candidates.find((item) => item.id === test.id) ??
      candidates.find((item) => item.gameId === activeGame) ??
      [...candidates].sort((a, b) => count(b.id) - count(a.id))[0];
    setKind(nextKind);
    setFamily(nextFamily);
    setModelId(nextModel);
    setGameId(nextTest.gameId);
    setSourceId(nextTest.sourceId);
    resetComparison();
  }
  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  }
  return (
    <section
      id="benchmark-results"
      className="fps-workspace"
      aria-label={ar ? "اختبارات الألعاب" : "Gaming benchmarks"}
    >
      <div className="fps-control-room">
        <div className="fps-topline">
          <span>
            <Gamepad2 size={21} />{" "}
            {ar ? "اختَر اللعبة. شاهد الأداء." : "PICK A GAME. FIND YOUR FRAME RATE."}
          </span>
          <span className="fps-live-label">{ar ? "نتائج منشورة" : "MEASURED RESULTS"}</span>
        </div>
        <div className="fps-controls">
          <div className="fps-kind" aria-label={ar ? "المكون المختبر" : "Component under test"}>
            <button aria-pressed={kind === "gpu"} onClick={() => changeKind("gpu")}>
              {ar ? "كروت الشاشة" : "Graphics cards"} <small>GPU</small>
            </button>
            <button aria-pressed={kind === "cpu"} onClick={() => changeKind("cpu")}>
              {ar ? "المعالجات" : "Processors"} <small>CPU</small>
            </button>
          </div>
          <label className="fps-game-select">
            <span id="fps-game-label">{ar ? "اللعبة" : "Game"}</span>
            <select
              aria-labelledby="fps-game-label"
              value={activeGame}
              onChange={(event) => {
                setGameId(event.target.value);
                const nextTests = gamingTestsFor(kind, event.target.value, family, modelId);
                setSourceId(
                  (nextTests.find((item) => item.sourceId === test.sourceId) ?? nextTests[0])
                    .sourceId,
                );
                resetComparison();
              }}
            >
              {games.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="fps-resolutions">
            <legend>{ar ? "الدقة" : "Resolution"}</legend>
            {gamingResolutions.map((value) => (
              <button
                key={value}
                aria-pressed={resolution === value}
                onClick={() => setResolution(value)}
              >
                {value}
              </button>
            ))}
          </fieldset>
        </div>
        <div className="fps-discovery">
          <label>
            <span id="fps-family-label">{ar ? "الجيل / المنصة" : "Generation / socket"}</span>
            <select
              aria-labelledby="fps-family-label"
              value={family}
              onChange={(event) => changeHardware(kind, event.target.value, "all")}
            >
              <option value="all">
                {ar ? "كل الأجيال والمنصات" : "All generations & sockets"}
              </option>
              {families.map(([id, name]) => (
                <option key={id} value={id}>
                  {name[locale]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span id="fps-model-label">
              {ar ? "ابحث عن قطعة في المكتبة" : "Find hardware across the library"}
            </span>
            <select
              aria-labelledby="fps-model-label"
              value={modelId}
              onChange={(event) => changeHardware(kind, family, event.target.value)}
            >
              <option value="all">
                {family === "all"
                  ? ar
                    ? "كل الموديلات"
                    : "All models"
                  : ar
                    ? "كل موديلات الجيل / المنصة"
                    : "All models in this generation / socket"}
              </option>
              {gamingModelIds(kind, family).map((id) => (
                <option key={id} value={id}>
                  {gamingModels[id]}
                </option>
              ))}
            </select>
          </label>
          <p>
            {ar
              ? "كل الموديلات يعرض القطع المختبرة في اللعبة والمراجعة والجيل المحددين. غيّر الفلاتر لاستكشاف بقية المكتبة."
              : "All models shows hardware tested in the selected game, review and generation. Change these filters to explore the library."}
          </p>
        </div>
      </div>
      <div className="fps-test-strip">
        <label>
          <span id="fps-series-label">{ar ? "مجموعة الاختبار" : "Test series"}</span>
          <select
            aria-labelledby="fps-series-label"
            value={test.sourceId}
            onChange={(event) => {
              setSourceId(event.target.value);
              resetComparison();
            }}
          >
            {availableTests.map((item) => (
              <option key={item.id} value={item.sourceId}>
                {gamingSources[item.sourceId].name[locale]} ·{" "}
                {number(
                  selectGamingResults(item.id, kind, resolution).filter(
                    (row) => matchesHardware(row.modelId) && row.average !== undefined,
                  ).length,
                )}{" "}
                {ar ? "موديل" : "models"}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span>{ar ? "الجودة" : "Quality preset"}</span>
          <strong>{test.preset}</strong>
        </div>
        <div>
          <span>
            {kind === "gpu"
              ? ar
                ? "المعالج المستخدم"
                : "Test CPU"
              : ar
                ? "كارت الشاشة المستخدم"
                : "Test GPU"}
          </span>
          <strong dir="ltr">
            {fixedHardware ? gamingModels[fixedHardware] : ar ? "غير مذكور" : "Not reported"}
          </strong>
        </div>
        <a href={source.url} target="_blank" rel="noreferrer">
          TechSpot · {date}
          <ArrowUpRight size={16} />
          <small>{ar ? "المراجعة الأصلية" : "Original review"}</small>
        </a>
      </div>
      <div className="fps-context">
        <h2 dir="ltr">
          {gamingGames[activeGame]}{" "}
          <span>
            {resolution} / {test.preset}
          </span>
        </h2>
        <p>
          {ar
            ? "كل ترتيب يضم نتائج من مراجعة واحدة بنفس الإعدادات. النتائج تخص جهاز الاختبار بالكامل وقد تختلف على جهازك."
            : "Each ranking uses one review and one preset. FPS describes the whole test system; your PC may perform differently."}
        </p>
        {kind === "cpu" && (
          <p className="fps-cpu-note">
            {ar
              ? "تختلف الدقات المنشورة بين مراجعات المعالجات. دقة 4K قد تجعل كارت الشاشة هو العامل المحدد وتقلل ظهور فروق المعالجات."
              : "Published resolutions vary by CPU review. At 4K, the GPU can become the limit and mask CPU differences."}
          </p>
        )}
        <details className="fps-method-details">
          <summary>
            {ar ? "منصة الاختبار وإعدادات الرندر" : "Test platform & rendering details"}
          </summary>
          <p>{source.platform[locale]}</p>
          <p>
            {test.rendering?.[locale] ??
              (ar
                ? "المصدر يذكر إعداد الجودة فقط؛ إعدادات رفع الدقة وتوليد الإطارات وتتبع الأشعة غير محددة."
                : "The source names the preset; upscaling, frame generation and ray tracing settings are not specified.")}
          </p>
          {chart && (
            <a href={`${source.chartBase}${chart}`} target="_blank" rel="noreferrer">
              {ar
                ? "افتح رسم المصدر للتحقق من الأرقام"
                : "Open the source chart to check the numbers"}{" "}
              <ArrowUpRight size={13} />
            </a>
          )}
        </details>
      </div>
      <div className="fps-filter-summary">
        <p>
          {ar
            ? `${number(rows.length)} من ${number(seriesModelCount)} موديل في هذه المراجعة بدقة ${resolution}`
            : `Showing ${number(rows.length)} of ${number(seriesModelCount)} models in this review at ${resolution}`}
          {family !== "all" && <span> · {gamingFamilies[family][locale]}</span>}
          {modelId !== "all" && <span dir="ltr"> · {gamingModels[modelId]}</span>}
          {query.trim() && <span> · {ar ? "بحث نشط" : "Search active"}</span>}
        </p>
        {(family !== "all" || modelId !== "all" || query) && (
          <button onClick={() => changeHardware(kind, "all", "all")}>
            <X size={14} /> {ar ? "إزالة فلاتر القطع" : "Clear hardware filters"}
          </button>
        )}
      </div>
      <div className="fps-toolbar">
        <label className="bench-search">
          <Search size={18} />
          <span className="sr-only">{ar ? "ابحث في موديلات الألعاب" : "Search gaming models"}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ar ? "ابحث داخل مجموعة الاختبار…" : "Find a model in this test series…"}
          />
        </label>
        <span role="status">
          {number(rows.length)} {ar ? "موديل" : "models"}
        </span>
        <div className="fps-legend">
          <span>
            <i />
            {ar ? "متوسط FPS" : "Average FPS"}
          </span>
          <span>
            <i />
            {ar ? "أدنى 1%" : "1% low"}
          </span>
        </div>
      </div>
      <div className="fps-results">
        {rows.map((row, index) => (
          <article className="fps-row" key={row.modelId}>
            <span className="fps-rank">{String(index + 1).padStart(2, "0")}</span>
            <div className="fps-model">
              <h3 dir="ltr">{row.model}</h3>
              <small>{ar ? "نفس المنصة والإعدادات" : "Same test series & preset"}</small>
            </div>
            <div className="fps-bars">
              <div className="fps-bar-line">
                <div className="fps-track" aria-hidden="true">
                  <i style={{ width: `${((row.average ?? 0) / max) * 100}%` }} />
                </div>
                <strong>
                  <span className="sr-only">{ar ? "متوسط FPS" : "Average FPS"}: </span>
                  {number(row.average)}
                </strong>
              </div>
              <div className="fps-bar-line fps-low">
                <div className="fps-track" aria-hidden="true">
                  <i style={{ width: `${((row.low ?? 0) / max) * 100}%` }} />
                </div>
                <span>
                  <span className="sr-only">{ar ? "أدنى 1%" : "1% low"}: </span>
                  {number(row.low)}
                </span>
              </div>
            </div>
            <button
              className="bench-add"
              aria-label={`${selected.includes(row.modelId) ? (ar ? "إزالة" : "Remove") : ar ? "مقارنة" : "Compare"} ${row.model}`}
              aria-pressed={selected.includes(row.modelId)}
              disabled={selected.length === 3 && !selected.includes(row.modelId)}
              onClick={() => toggle(row.modelId)}
            >
              {selected.includes(row.modelId) ? <Check size={18} /> : <Plus size={18} />}
            </button>
          </article>
        ))}
        {!resolutionAvailable ? (
          <div className="bench-empty" role="status">
            <Gamepad2 size={28} />
            <h3>
              {ar
                ? `لا توجد قياسات منشورة بدقة ${resolution}`
                : `No published ${resolution} measurements`}
            </h3>
            <p>
              {ar
                ? "هذه المراجعة لم تنشر نتائج بهذه الدقة. اختر دقة متاحة؛ لا نقدر FPS."
                : "This review did not publish results at this resolution. Choose an available resolution; FPS is never estimated."}
            </p>
            {gamingResolutions
              .filter((_, index) => allRows.some((row) => row.fps[index]))
              .map((res) => (
                <button key={res} onClick={() => setResolution(res)}>
                  {ar ? `عرض ${res}` : `Show ${res}`}
                </button>
              ))}
          </div>
        ) : (
          rows.length === 0 && (
            <div className="bench-empty">
              <Search size={28} />
              <h3>
                {ar ? "لا توجد قياسات لهذا الموديل هنا" : "No measured result for this model here"}
              </h3>
              <p>
                {ar
                  ? "جرّب مجموعة اختبار أو لعبة أخرى. لا نقدر الأرقام الناقصة."
                  : "Try another test series or game. Missing measurements are never estimated."}
              </p>
              <button onClick={() => setQuery("")}>{ar ? "مسح البحث" : "Clear search"}</button>
            </div>
          )
        )}
      </div>
      <div className="fps-explainer">
        <p>
          {ar
            ? "متوسط FPS يوضح الأداء العام. أدنى 1% يوضح سلاسة اللحظات الأبطأ، وليس الحد الأدنى المطلق. الأعلى أفضل لكليهما."
            : "Average FPS shows overall speed. The 1% low describes slower moments, not the absolute minimum. Higher is better for both."}
        </p>
        <p>
          {ar
            ? "النتائج لقطة محفوظة؛ تحديثات الألعاب والتعريفات قد تغير الأداء."
            : "A saved review snapshot. Game and driver updates can change performance."}
        </p>
      </div>
      <section
        className="fps-comparison"
        aria-label={ar ? "مقارنة دقات الألعاب" : "Gaming resolution comparison"}
      >
        <div className="bench-compare-heading">
          <h3>
            {ar ? "ثلاث دقات. جنبًا إلى جنب." : "Three resolutions. Side by side."}{" "}
            <span>{selected.length}/3</span>
          </h3>
          {selected.length > 0 && (
            <button onClick={() => setSelected([])}>
              {ar ? "مسح المقارنة" : "Clear comparison"} <X size={15} />
            </button>
          )}
        </div>
        {compared.length === 0 ? (
          <p>
            {ar
              ? "اضغط + بجوار حتى ثلاثة موديلات. سترى متوسط FPS وأدنى 1% في كل دقة."
              : "Add up to three models with +. See their average FPS and 1% lows at every resolution."}
          </p>
        ) : (
          <div className="fps-compare-grid">
            {compared.map((row) => (
              <article key={row.modelId}>
                <h4 dir="ltr">{row.model}</h4>
                <p dir="ltr">
                  {gamingGames[activeGame]} · {test.preset}
                </p>
                <dl>
                  {gamingResolutions.map((res, index) => (
                    <div key={res} data-active={res === resolution}>
                      <dt>{res}</dt>
                      <dd>
                        {row.fps[index] ? (
                          <>
                            <strong>{number(row.fps[index]?.[0])}</strong>
                            <span> / {number(row.fps[index]?.[1])}</span>
                            <small>FPS</small>
                          </>
                        ) : (
                          <span>{ar ? "غير منشور" : "Not reported"}</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                <small>{ar ? "متوسط / أدنى 1%" : "Average / 1% low"}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
