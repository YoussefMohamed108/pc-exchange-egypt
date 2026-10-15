"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { processOrder } from "@/app/actions/commerce";
import type { Order, Locale } from "@/lib/domain";
import { dictionary } from "@/lib/i18n";
import { Button } from "./ui/button";
export function OrderActions({ order, locale }: { order: Order; locale: Locale }) {
  const t = dictionary(locale),
    [pending, startTransition] = useTransition();
  const actions = [
    { action: "confirm", label: t.confirm, show: order.status === "pending" },
    { action: "ready", label: t.ready, show: order.status === "confirmed" },
    {
      action: "verify_payment",
      label: t.verifyPayment,
      show:
        order.payment_status !== "verified" &&
        (order.payment_method === "cash_on_pickup" || order.payment_status === "submitted"),
    },
    {
      action: "complete",
      label: t.complete,
      show: order.status === "ready" && order.payment_status === "verified",
    },
    { action: "cancel", label: t.cancel, show: order.payment_status !== "verified" },
  ];
  if (order.status === "completed" || order.status === "cancelled") return null;
  return (
    <div className="order-actions">
      {actions
        .filter((a) => a.show)
        .map(({ action, label }) => (
          <Button
            key={action}
            variant={action === "cancel" ? "destructive" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`${label}?`)) return;
              startTransition(async () => {
                try {
                  const result = await processOrder(locale, order.id, action);
                  if (result.error) toast.error(t.actionFailed);
                  else toast.success(t.actionDone);
                } catch {
                  toast.error(t.actionFailed);
                }
              });
            }}
          >
            {label}
          </Button>
        ))}
    </div>
  );
}
