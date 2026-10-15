"use client";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { useCart } from "./cart-provider";
import { dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/domain";
export function AddToCart({
  id,
  locale,
  available,
}: {
  id: string;
  locale: Locale;
  available: boolean;
}) {
  const cart = useCart(),
    t = dictionary(locale);
  return (
    <Button
      disabled={!available}
      onClick={() => {
        cart.add(id);
        toast.success(t.addedToCart);
      }}
    >
      <ShoppingBag size={17} />
      {available ? t.addToCart : t.outOfStock}
    </Button>
  );
}
