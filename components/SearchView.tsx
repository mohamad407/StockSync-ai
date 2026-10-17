"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { restockPlan, formatINR } from "@/lib/predict";
import type { Cart, Product } from "@/lib/types";
import { addToCart, createCart, searchProducts } from "@/services/instamart";
import { Button, Card, Spinner } from "./ui";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; results: Record<string, Product[]> };

export default function SearchView({ onBack, onCart }: { onBack: () => void; onCart: (cart: Cart) => void }) {
  const plan = useMemo(() => restockPlan(), []);
  const [state, setState] = useState<State>({ status: "loading" });
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const entries = await Promise.all(plan.map(async (i) => [i.id, await searchProducts(i.id)] as const));
      const results = Object.fromEntries(entries);
      setSelected((prev) => {
        const next = { ...prev };
        for (const [id, list] of entries) if (!next[id]) next[id] = (list.find((p) => p.preferred) ?? list[0]).id;
        return next;
      });
      setState({ status: "ready", results });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Something went wrong." });
    }
  }, [plan]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(() => {
    if (state.status !== "ready") return 0;
    return plan.reduce((sum, i) => sum + (state.results[i.id]?.find((p) => p.id === selected[i.id])?.price ?? 0), 0);
  }, [state, selected, plan]);

  async function addAll() {
    setAdding(true);
    setAddError(null);
    try {
      let cart = await createCart();
      for (const i of plan) cart = await addToCart(cart.id, selected[i.id], 1);
      onCart(cart);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not build the cart.");
      setAdding(false);
    }
  }

  return (
    <div className="animate-rise pb-24">
      <button onClick={onBack} className="mt-8 text-sm font-semibold text-ink-soft hover:text-ink">â† Back to plan</button>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-bold tracking-tight">Find on Instamart</h1>
        
      </div>
      <p className="mt-2 text-ink-soft">
        Live product results from Swiggy Instamart. Prices and availability may change.
      </p>

      {state.status === "loading" && (
        <div className="mt-6 space-y-6" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft"><Spinner /> Searching Instamart for {plan.length} items...</p>
          {plan.map((i) => (
            <div key={i.id} className="space-y-3">
              <div className="h-5 w-28 animate-pulse rounded bg-line" />
              {[0, 1, 2].map((k) => <div key={k} className="h-[76px] animate-pulse rounded-3xl bg-white shadow-card" />)}
            </div>
          ))}
        </div>
      )}

      {state.status === "error" && (
        <Card className="mt-6 border-alert/30 p-6" >
          <p className="font-display text-lg font-bold text-alert">Couldn&apos;t load products</p>
          <p className="mt-1 text-ink-soft">{state.message}</p>
          <Button className="mt-4" onClick={load}>Try again</Button>
        </Card>
      )}

      {state.status === "ready" && (
        <>
          <div className="mt-6 space-y-8">
            {plan.map((item) => (
              <section key={item.id} aria-label={`${item.name} products`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                    <span aria-hidden="true">{item.emoji}</span> {item.name}
                  </h2>
                  <span className="text-xs text-ink-soft sm:text-sm">
                    {state.results[item.id]?.length ?? 0} options
                  </span>
                </div>

                <div
                  className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
                  role="radiogroup"
                  aria-label={`Choose ${item.name}`}
                >
                  {(state.results[item.id] ?? []).map((p) => {
                    const on = selected[item.id] === p.id;
                    const discount =
                      p.mrp && p.mrp > p.price
                        ? Math.round(((p.mrp - p.price) / p.mrp) * 100)
                        : 0;

                    return (
                      <article
                        key={p.id}
                        className={`min-w-0 overflow-hidden rounded-2xl border bg-white shadow-card transition ${
                          on
                            ? "border-sync ring-1 ring-sync/30"
                            : "border-line hover:border-sync/50"
                        }`}
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() =>
                            setSelected((s) => ({ ...s, [item.id]: p.id }))
                          }
                          aria-label={`Select ${p.name}, ${p.size}`}
                          className="flex w-full min-w-0 items-start gap-3 p-3 text-left sm:p-4"
                        >
                          <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-paper sm:h-28 sm:w-28">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt=""
                                className="h-full w-full object-contain p-1"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-3xl" aria-hidden="true">
                                {p.emoji}
                              </span>
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block line-clamp-2 text-sm font-semibold leading-5 text-ink sm:text-base">
                              {p.name}
                            </span>
                            <span className="mt-1 block text-xs text-ink-soft sm:text-sm">
                              {p.brand}
                            </span>
                            <span className="mt-1 block text-xs text-ink-soft sm:text-sm">
                              {p.size}
                            </span>

                            {(p.rating || p.deliveryTime) && (
                              <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                                {p.rating && (
                                  <span className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 font-semibold text-green-800">
                                    ★ {p.rating}
                                    {p.ratingCount ? ` (${p.ratingCount})` : ""}
                                  </span>
                                )}
                                {p.deliveryTime && (
                                  <span>⚡ {p.deliveryTime}</span>
                                )}
                              </span>
                            )}

                            {on && (
                              <span className="mt-2 inline-block text-xs font-semibold text-sync-deep">
                                ✓ Selected for restock
                              </span>
                            )}
                          </span>
                        </button>

                        <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-3 sm:px-4">
                          <div className="min-w-0">
                            {discount > 0 && (
                              <span className="mb-1 inline-block rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-800 sm:text-xs">
                                {discount}% OFF
                              </span>
                            )}
                            <p className="font-display text-base font-bold text-ink sm:text-lg">
                              {formatINR(p.price)}
                            </p>
                            {p.mrp && p.mrp > p.price && (
                              <p className="text-xs text-ink-mute line-through">
                                {formatINR(p.mrp)}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSelected((s) => ({ ...s, [item.id]: p.id }))
                            }
                            aria-pressed={on}
                            className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                              on
                                ? "border-sync bg-sync text-white"
                                : "border-sync/50 bg-white text-sync hover:bg-sync-soft"
                            }`}
                          >
                            {on ? "✓ Selected" : "Select"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <Card className="mt-8 flex flex-wrap items-center justify-between gap-4 bg-sync-soft p-5">
            <div>
              <p className="text-sm text-ink-soft">Selected {plan.length} items</p>
              <p className="font-display text-2xl font-bold text-sync-deep">{formatINR(total)}</p>
              {addError && <p className="mt-1 text-sm font-semibold text-alert">{addError}</p>}
            </div>
            <Button onClick={addAll} disabled={adding}>
              {adding ? <><Spinner /> Building cart...</> : "Add to cart"}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}



