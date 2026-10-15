"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, RotateCcw, ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import type { Locale } from "@/lib/domain";
import { pcParts, partById, partHref, type PcPartId } from "@/lib/pc-parts";
import type { PcSceneController, Projection } from "@/lib/pc-scene";
import styles from "./pc-explorer.module.css";

export function PcExplorer({ locale }: { locale: Locale }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<PcSceneController | null>(null);
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [hovered, setHovered] = useState<PcPartId | null>(null);
  const [positions, setPositions] = useState<Projection | null>(null);
  const ar = locale === "ar";
  useEffect(() => {
    let cancelled = false;
    import("@/lib/pc-scene")
      .then(({ mountPcScene }) => {
        if (cancelled || !host.current) return;
        try {
          scene.current = mountPcScene(host.current, {
            onSelect: (id) => router.push(partHref(id, locale)),
            onHover: setHovered,
            onProject: setPositions,
            onError: () => {
              setStatus("fallback");
              scene.current?.dispose();
              scene.current = null;
            },
          });
          setStatus("ready");
        } catch {
          setStatus("fallback");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [locale, router]);
  const active = hovered ? partById(hovered) : null;
  return (
    <section
      className={styles.explorer}
      aria-label={ar ? "تسوق مكونات الكمبيوتر ثلاثي الأبعاد" : "Shop the interactive 3D PC"}
    >
      <div className={styles.stage} data-pc-status={status}>
        <div className={styles.disc} aria-hidden="true" />
        <div className={styles.caption}>
          <span className={styles.cross}>✳</span>
          <span>{ar ? "ترقيتك تبدأ من هنا" : "YOUR UPGRADE, INSIDE."}</span>
        </div>
        <span className={styles.edition} aria-hidden="true">
          PCX—01
          <br />
          OPEN / SYSTEM
        </span>
        <div className={styles.canvas} ref={host} />
        {status !== "ready" && (
          <div className={styles.fallback} role="status">
            <svg viewBox="0 0 160 220" aria-hidden="true">
              <path
                d="M25 30 112 10 143 35 143 195 55 215 25 190Z"
                fill="#ddd6c9"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M25 30 55 54 143 35M55 54V215"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M68 70 130 57V170L68 185Z" fill="#b9b5cc" />
              <path d="m74 133 49-11v25l-49 11Z" fill="#e9673b" />
              <circle cx="97" cy="98" r="14" fill="#f3f0e8" />
            </svg>
            <p>
              {status === "loading"
                ? ar
                  ? "جارٍ تجهيز الكمبيوتر…"
                  : "Putting the parts together…"
                : ar
                  ? "العرض ثلاثي الأبعاد غير متاح. اختر المكون من الروابط بالأسفل."
                  : "3D isn’t available on this device. Explore the parts below."}
            </p>
          </div>
        )}
        {status === "ready" &&
          positions &&
          (["gpu", "cpu", "storage"] as PcPartId[])
            .filter((id) => positions[id].visible)
            .map((id) => (
              <Link
                key={id}
                href={partHref(id, locale)}
                className={styles.hotspot}
                data-hotspot={id}
                aria-label={`${ar ? "تسوق" : "Shop"} ${partById(id)[locale]}`}
                style={{ left: `${positions[id].x}%`, top: `${positions[id].y}%` }}
                onMouseEnter={() => {
                  setHovered(id);
                  scene.current?.highlight(id);
                }}
                onMouseLeave={() => {
                  setHovered(null);
                  scene.current?.highlight(null);
                }}
                onFocus={() => {
                  setHovered(id);
                  scene.current?.highlight(id);
                }}
                onBlur={() => {
                  setHovered(null);
                  scene.current?.highlight(null);
                }}
              >
                <span />
                <b>
                  {partById(id).code}
                  <ArrowUpRight size={12} />
                </b>
              </Link>
            ))}
        <div className={styles.note}>
          {ar ? "اضغط على قطعة. اكتشف فئتها." : "Click a part. Find your upgrade."}
          <svg viewBox="0 0 72 35" aria-hidden="true">
            <path
              d="M3 5Q35 33 65 10M54 9L67 9L65 23"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.hint} aria-live="polite">
          {active ? (
            <>
              <span className={styles.activeDot} style={{ background: active.color }} />
              {active[locale]}
              <ArrowUpRight size={14} />
            </>
          ) : (
            <>
              <MoveHorizontal size={17} />
              {ar ? "اسحب للتدوير · اضغط للتسوق" : "Drag to rotate · click to shop"}
            </>
          )}
        </div>
        <div className={styles.controls}>
          <button
            disabled={status !== "ready"}
            onClick={() => scene.current?.rotate(1)}
            aria-label={ar ? "تدوير لليسار" : "Rotate PC left"}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            disabled={status !== "ready"}
            onClick={() => scene.current?.reset()}
            aria-label={ar ? "إعادة ضبط العرض" : "Reset PC view"}
          >
            <RotateCcw size={15} />
          </button>
          <button
            disabled={status !== "ready"}
            onClick={() => scene.current?.rotate(-1)}
            aria-label={ar ? "تدوير لليمين" : "Rotate PC right"}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <nav
        className={styles.parts}
        aria-label={ar ? "فئات مكونات الكمبيوتر" : "PC component categories"}
      >
        {pcParts.map((part, i) => (
          <Link
            key={part.id}
            href={partHref(part.id, locale)}
            data-part-link={part.id}
            onMouseEnter={() => scene.current?.highlight(part.id)}
            onMouseLeave={() => scene.current?.highlight(null)}
            onFocus={() => scene.current?.highlight(part.id)}
            onBlur={() => scene.current?.highlight(null)}
          >
            <span className={styles.index}>0{i + 1}</span>
            <span>{part[locale]}</span>
            <ArrowUpRight size={13} />
          </Link>
        ))}
      </nav>
      <p className={styles.disclaimer}>
        {ar
          ? "رسم توضيحي للفئات، وليس تجميعة معروضة للبيع."
          : "A guide to the parts. Not a build offered for sale."}
      </p>
    </section>
  );
}
