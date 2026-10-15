"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { loadCart, checkout } from "@/app/actions/commerce";
import type { Product, Locale } from "@/lib/domain";
import { dictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-provider";
import { EmptyState } from "./ui/empty-state";
import { Button } from "./ui/button";
import { Input, Select } from "./ui/input";
export function CartPage({
  locale,
  signedIn,
  configured,
}: {
  locale: Locale;
  signedIn: boolean;
  configured: boolean;
}) {
  const cart = useCart(),
    t = dictionary(locale),
    router = useRouter();
  const [products, setProducts] = useState<Product[]>([]),
    [methods, setMethods] = useState<string[]>([]),
    [loading, startLoading] = useTransition(),
    [loadError, setLoadError] = useState(false),
    [showCheckout, setShowCheckout] = useState(false),
    [pending, startTransition] = useTransition(),
    [key, setKey] = useState("");
  const ids = JSON.stringify(cart.items.map((i) => i.product_id));
  useEffect(() => {
    let active = true;
    if (!JSON.parse(ids).length) return;
    startLoading(async () => {
      try {
        const result = await loadCart(JSON.parse(ids));
        if (active) {
          setProducts(result.products);
          setMethods(result.methods);
          setLoadError(result.error);
        }
      } catch {
        if (active) {
          setLoadError(true);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [ids]);
  const total = cart.items.reduce(
      (sum, item) =>
        sum + (products.find((p) => p.id === item.product_id)?.price_piastres || 0) * item.quantity,
      0,
    ),
    invalid = cart.items.some((i) => {
      const p = products.find((p) => p.id === i.product_id);
      return !p || p.available_quantity < i.quantity;
    });
  const paymentNames: Record<string, string> = {
    cash_on_pickup: t.cash,
    bank_transfer: t.bank,
    instapay: t.instapay,
    mobile_wallet: t.wallet,
  };
  const onSubmit = (form: FormData) => {
    startTransition(async () => {
      try {
        const result = await checkout(locale, {
          items: cart.items,
          payment_method: form.get("payment_method"),
          phone: form.get("phone"),
          idempotency_key: key,
        });
        if (result.error) {
          toast.error(t.orderFailed);
          return;
        }
        cart.clear();
        toast.success(t.orderSuccess);
        router.push(`/${locale}/account`);
      } catch {
        toast.error(t.orderFailed);
      }
    });
  };
  return (
    <div className="container content-section">
      <h1>{t.cartTitle}</h1>
      {!cart.items.length ? (
        <EmptyState title={t.cartEmpty} description={t.cartEmptyText}>
          <Button asChild>
            <Link href={`/${locale}/catalog`}>
              {t.continueShopping}
              <ArrowRight size={15} />
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="cart-layout">
          <section>
            {loading && <div className="notice">{t.saving}</div>}
            {loadError && <div className="notice error">{t.queryError}</div>}
            {cart.items.map((item) => {
              const p = products.find((p) => p.id === item.product_id);
              return (
                <div className="cart-line" key={item.product_id}>
                  <div className="cart-line-art">
                    <Package />
                  </div>
                  <div className="line-info">
                    <h3>
                      {p ? (
                        <Link href={`/${locale}/products/${p.slug}`}>
                          {locale === "ar" && p.title_ar ? p.title_ar : p.title}
                        </Link>
                      ) : (
                        t.outOfStock
                      )}
                    </h3>
                    <p>{p ? `${t.grade} ${p.condition}` : t.cartUnavailable}</p>
                  </div>
                  <Input
                    type="number"
                    aria-label={t.quantity}
                    min={1}
                    max={Math.min(10, p?.available_quantity || 10)}
                    value={item.quantity}
                    onChange={(e) => {
                      setKey(crypto.randomUUID());
                      cart.update(item.product_id, Number(e.target.value));
                    }}
                  />
                  <span className="product-price">
                    {p ? formatMoney(p.price_piastres * item.quantity, locale) : "—"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t.remove}
                    onClick={() => {
                      setKey(crypto.randomUUID());
                      cart.remove(item.product_id);
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              );
            })}
            <Link className="section-link" style={{ marginTop: 25 }} href={`/${locale}/catalog`}>
              {t.continueShopping}
            </Link>
          </section>
          <aside className="panel cart-summary">
            <h2>{showCheckout ? t.checkoutTitle : t.subtotal}</h2>
            <div className="summary-row">
              <span>{t.total}</span>
              <strong>{formatMoney(total, locale)}</strong>
            </div>
            {invalid && !loading && <div className="notice error">{t.cartUnavailable}</div>}
            {!signedIn ? (
              <Button asChild>
                <Link href={`/${locale}/auth?next=/${locale}/cart`}>{t.loginCheckout}</Link>
              </Button>
            ) : !showCheckout ? (
              <Button
                disabled={invalid || loading || !configured}
                onClick={() => {
                  setShowCheckout(true);
                  setKey(crypto.randomUUID());
                }}
              >
                {t.checkout}
                <ArrowRight size={15} />
              </Button>
            ) : (
              <form action={onSubmit}>
                <div className="field">
                  <label htmlFor="checkout-phone">{t.phone}</label>
                  <Input
                    id="checkout-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="01012345678"
                    pattern="(?:\+20|0)1[0125][0-9]{8}"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="payment-method">{t.payment}</label>
                  <Select id="payment-method" name="payment_method" required>
                    {methods
                      .filter((m) => paymentNames[m])
                      .map((m) => (
                        <option value={m} key={m}>
                          {paymentNames[m]}
                        </option>
                      ))}
                  </Select>
                </div>
                <p style={{ fontSize: 11, marginBottom: 20 }}>{t.pickupText}</p>
                <Button type="submit" disabled={pending || invalid || !methods.length || !key}>
                  {pending ? t.saving : t.placeOrder}
                </Button>
              </form>
            )}
            <p style={{ marginTop: 20 }}>{t.checkoutNote}</p>
          </aside>
        </div>
      )}
    </div>
  );
}
