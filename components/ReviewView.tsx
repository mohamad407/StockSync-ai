"use client";

import { useState } from "react";
import type { Cart } from "@/lib/types";
import { formatINR } from "@/lib/predict";
import { checkout } from "@/services/instamart";
import { Button, Card, DemoBadge, Spinner } from "./ui";

export default function ReviewView({ cart, onBack, onDone }: { cart: Cart; onBack: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      // Demo checkout only prepares the cart. No order is placed.
      await checkout(cart.id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare the cart.");
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise pb-24">
      <button onClick={onBack} className="mt-8 text-sm font-semibold text-ink-soft hover:text-ink">← Back to cart</button>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-bold tracking-tight">Review your restock</h1>
        <DemoBadge />
      </div>
      <p className="mt-2 text-ink-soft">StockSync has prepared this cart based on your predicted household needs.</p>

      <Card className="mt-6 p-5">
        <p className="font-display text-lg font-bold">Items</p>
        <ul className="mt-3 divide-y divide-line">
          {cart.lines.map((l) => (
            <li key={l.product.id} className="flex items-center justify-between gap-3 py-2.5">
              <span><span aria-hidden>{l.product.emoji}</span> {l.product.name} <span className="text-ink-soft">({l.product.size})</span></span>
              <span className="font-semibold">{formatINR(l.product.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-2 border-t border-line pt-4 text-[15px]">
          <div className="flex justify-between"><span className="text-ink-soft">Delivery estimate</span><span className="font-semibold">10–15 minutes (demo)</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Estimated total</span><span className="font-display text-2xl font-bold text-sync-deep">{formatINR(cart.total)}</span></div>
        </div>
      </Card>

      <p className="mt-4 rounded-2xl bg-amber2-soft px-4 py-3 text-sm text-amber2">
        Demo only: confirming prepares the cart for review. No order is placed and nothing is charged.
      </p>
      {error && <p className="mt-3 text-sm font-semibold text-alert">{error}</p>}
      <Button className="mt-5 w-full sm:w-auto" onClick={confirm} disabled={busy}>
        {busy ? <><Spinner /> Preparing...</> : "Confirm & Continue"}
      </Button>
    </div>
  );
}
