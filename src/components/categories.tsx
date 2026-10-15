import Link from "next/link";
import {
  Cpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  Gpu,
  Monitor,
  ArrowUpRight,
  Zap,
  Fan,
  Box,
  Keyboard,
  Computer,
  Laptop,
  Package,
} from "lucide-react";
import type { CategorySlug, Locale } from "@/lib/domain";
import { categoryName } from "@/lib/i18n";
export const categoryIcons = {
  "graphics-cards": Gpu,
  processors: Cpu,
  motherboards: CircuitBoard,
  memory: MemoryStick,
  storage: HardDrive,
  "power-supplies": Zap,
  cases: Box,
  cooling: Fan,
  monitors: Monitor,
  peripherals: Keyboard,
  "pc-builds": Computer,
  laptops: Laptop,
  other: Package,
};
const featured: CategorySlug[] = [
  "graphics-cards",
  "processors",
  "motherboards",
  "memory",
  "storage",
  "monitors",
];
export function CategoryGrid({ locale }: { locale: Locale }) {
  return (
    <div className="category-grid">
      {featured.map((slug, index) => {
        const Icon = categoryIcons[slug];
        return (
          <Link key={slug} href={`/${locale}/catalog?category=${slug}`} className="category-card">
            <span className="category-index" aria-hidden="true">
              0{index + 1}
            </span>
            <ArrowUpRight className="category-arrow rtl-arrow" />
            <span className="category-art">
              <Icon />
            </span>
            <span>{categoryName(slug, locale)}</span>
          </Link>
        );
      })}
    </div>
  );
}
