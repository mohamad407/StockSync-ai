"use client";

import type { Cart } from "@/lib/types";
import { formatINR } from "@/lib/predict";
import { Button, Card } from "./ui";

export default function CartView({
  cart,
  onBack,
  onNext,
}: {
  cart: Cart;
  onBack: () => void;
  onNext: () => void;
}) {
  const itemCount = cart.lines.reduce((sum, line) => sum + line.qty, 0);

  const totalSavings = cart.lines.reduce((sum, line) => {
    const product = line.product;
    const saving =
      product.mrp && product.mrp > product.price
        ? product.mrp - product.price
        : 0;

    return sum + saving * line.qty;
  }, 0);

  return (
    <main className="animate-rise pb-28">
      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-ink-soft transition hover:text-sync-deep"
      >
        <span aria-hidden="true">←</span>
        Change products
      </button>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sync-deep">
            Your shopping list
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Your Restock Cart
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Review your selected Instamart products before continuing.
          </p>
        </div>

        <span className="rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-soft">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      </header>

      {cart.lines.length === 0 ? (
        <Card className="mt-6 p-8 text-center sm:p-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-paper text-3xl">
            🛒
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">
            Your cart is empty
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Find products to start building your restock list.
          </p>
          <Button className="mt-5" onClick={onBack}>
            Find products
          </Button>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
          <section aria-label="Selected products" className="min-w-0">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
                <h2 className="font-display text-lg font-bold">
                  Selected products
                </h2>
                <span className="text-xs text-ink-soft">
                  {cart.lines.length} product types
                </span>
              </div>

              <div className="divide-y divide-line">
                {cart.lines.map((line) => {
                  const product = line.product;
                  const savingPerUnit =
                    product.mrp && product.mrp > product.price
                      ? product.mrp - product.price
                      : 0;
                  const discount =
                    product.mrp && product.mrp > product.price
                      ? Math.round(
                          ((product.mrp - product.price) / product.mrp) * 100
                        )
                      : 0;

                  return (
                    <article
                      key={product.id}
                      className="flex min-w-0 gap-3 p-3 transition hover:bg-paper/50 sm:gap-4 sm:p-5"
                    >
                      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-line/70 bg-paper sm:h-28 sm:w-28">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-contain p-2"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-3xl" aria-hidden="true">
                            {product.emoji}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-ink sm:text-base">
                          {product.name}
                        </h3>

                        {product.brand && (
                          <p className="mt-1 text-xs text-ink-soft sm:text-sm">
                            {product.brand}
                          </p>
                        )}

                        {product.size && (
                          <p className="mt-1 text-xs text-ink-soft sm:text-sm">
                            {product.size}
                          </p>
                        )}

                        {product.rating && (
                          <p className="mt-2 text-xs text-ink-soft">
                            ★ {product.rating}
                            {product.ratingCount
                              ? ` (${product.ratingCount})`
                              : ""}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink">
                            Qty: {line.qty}
                          </span>

                          {discount > 0 && (
                            <span className="rounded-lg bg-green-50 px-2 py-1.5 text-xs font-bold text-green-800">
                              {discount}% OFF
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-[88px] shrink-0 text-right sm:w-28">
                        <p className="font-display text-base font-bold text-ink sm:text-lg">
                          {formatINR(product.price * line.qty)}
                        </p>

                        {product.mrp && product.mrp > product.price && (
                          <p className="mt-1 text-xs text-ink-mute line-through">
                            {formatINR(product.mrp * line.qty)}
                          </p>
                        )}

                        {savingPerUnit > 0 && (
                          <p className="mt-2 text-xs font-bold text-green-700">
                            Save {formatINR(savingPerUnit * line.qty)}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="border-t border-line bg-paper/60 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-sm font-semibold text-sync-deep transition hover:underline"
                >
                  + Change or add products
                </button>
              </div>
            </Card>
          </section>

          <aside className="min-w-0 lg:sticky lg:top-6">
            <Card className="overflow-hidden">
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-display text-xl font-bold">
                  Bill details
                </h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Estimated shopping summary
                </p>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-ink-soft">
                    Items ({itemCount})
                  </span>
                  <span className="font-semibold text-ink">
                    {formatINR(cart.total)}
                  </span>
                </div>

                {totalSavings > 0 && (
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-green-700">Product savings</span>
                    <span className="font-semibold text-green-700">
                      −{formatINR(totalSavings)}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-ink-soft">Delivery fee</span>
                  <span className="text-right text-xs font-medium text-ink-soft">
                    Not calculated
                  </span>
                </div>

                <div className="border-t border-dashed border-line pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">
                        Estimated total
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        Before delivery fees
                      </p>
                    </div>
                    <p className="font-display text-2xl font-bold text-sync-deep">
                      {formatINR(cart.total)}
                    </p>
                  </div>
                </div>

                {totalSavings > 0 && (
                  <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">
                    <span aria-hidden="true">✓</span>
                    You save {formatINR(totalSavings)} on listed MRP
                  </div>
                )}

                <div className="rounded-xl bg-paper p-3 text-xs leading-5 text-ink-soft">
                  <p className="font-semibold text-ink">
                    Local cart preview
                  </p>
                  No order or payment will be placed. Final prices, delivery
                  fees, and availability may change.
                </div>

                <Button
                  className="w-full"
                  onClick={onNext}
                  disabled={cart.lines.length === 0}
                >
                  Review selections →
                </Button>

                <button
                  type="button"
                  onClick={onBack}
                  className="w-full rounded-lg py-2 text-sm font-semibold text-sync-deep transition hover:bg-sync-soft"
                >
                  Continue shopping
                </button>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </main>
  );
}
