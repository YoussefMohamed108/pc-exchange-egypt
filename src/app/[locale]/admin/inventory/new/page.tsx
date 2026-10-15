import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { requireStaff } from "@/lib/auth";
import { dictionary } from "@/lib/i18n";
import { InventoryForm } from "@/components/inventory-form";
export default async function NewInventory({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireStaff(locale);
  return (
    <>
      <div className="admin-heading">
        <h1>{dictionary(locale).addProduct}</h1>
      </div>
      <InventoryForm locale={locale} />
    </>
  );
}
