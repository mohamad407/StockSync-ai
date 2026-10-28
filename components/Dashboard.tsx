"use client";

import { useMemo } from "react";
import { useInventory } from "@/lib/useInventory";
import { useHistory } from "@/lib/useHistory";
import { Button } from "./ui";
import GroceryHistory from "./GroceryHistory";
import InventoryManager from "./InventoryManager";
import InstamartOrderSync from "./InstamartOrderSync";
import RestockRecommendations from "./RestockRecommendations";
import LowStockEmailButton from "./LowStockEmailButton";

type Tone = "green" | "amber" | "blue" | "slate";

const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-sync-soft text-sync-deep",
  amber: "bg-amber2-soft text-amber2",
  blue: "bg-sky-50 text-sky-700",
  slate: "bg-slate-100 text-slate-700",
};

function StatTile({
  label,
  value,
  detail,
  icon,
  tone = "green",
  index = 0,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
  tone?: Tone;
  index?: number;
}) {
  return (
    <div
      className="ss-card animate-rise min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${TONE_CLASSES[tone]}`}
        >
          {icon}
        </span>
        <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
          {label}
        </span>
      </div>
      <p className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-ink-soft">{detail}</p>
    </div>
  );
}

function StockRing({
  percent,
  loading,
}: {
  percent: number;
  loading: boolean;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const shown = loading ? 0 : percent;
  const offset = circumference * (1 - shown / 100);

  return (
    <div className="relative grid h-32 w-32 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#6EE7B7"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-3xl font-bold">{loading ? "—" : `${percent}%`}</p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-100/70">
          stocked
        </p>
      </div>
    </div>
  );
}

export default function Dashboard({ onView }: { onView: () => void }) {
  const inventory = useInventory();
  const history = useHistory();

  const loading = inventory.loading || history.loading;
  const error = inventory.error || history.error;

  const summary = useMemo(() => {
    const lowStockItems = inventory.items.filter((item) => {
      const quantity = Number(item.quantity);
      const threshold = Number(item.lowStockThreshold);
      return (
        Number.isFinite(quantity) &&
        Number.isFinite(threshold) &&
        quantity <= threshold
      );
    });

    const totalItems = inventory.items.length;
    const percent =
      totalItems === 0
        ? 0
        : Math.round(((totalItems - lowStockItems.length) / totalItems) * 100);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonth = history.events.filter((event) => {
      const date = new Date(event.eventDate);
      return !Number.isNaN(date.getTime()) && date >= monthStart && date <= now;
    });

    return {
      totalItems,
      lowStockItems,
      percent,
      purchased: thisMonth.filter((e) => e.eventType === "purchased").length,
      consumed: thisMonth.filter((e) => e.eventType === "consumed").length,
    };
  }, [inventory.items, history.events]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const lowCount = summary.lowStockItems.length;
  const previewItems = summary.lowStockItems.slice(0, 5);
  const hiddenCount = Math.max(0, lowCount - previewItems.length);

  const headline = loading
    ? "Syncing your pantry…"
    : summary.totalItems === 0
      ? "Start by adding what's in your pantry."
      : lowCount > 0
        ? `${lowCount} ${lowCount === 1 ? "item needs" : "items need"} restocking soon.`
        : "Everything is above its restock threshold.";

  return (
    <main className="space-y-6 pb-10 pt-5 sm:space-y-8 sm:pt-8">
      {/* Hero */}
      <section className="ss-animate-in relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B7A5C] via-[#075640] to-[#053D2F] p-6 text-white shadow-[0_24px_60px_-28px_rgba(7,86,64,0.7)] sm:rounded-[2rem] sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl"
        />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200/90">
              {greeting}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-[2.75rem]">
              Your pantry, at a glance.
            </h1>
            <p className="mt-3 text-sm leading-6 text-emerald-50/85 sm:text-base">
              {headline}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onView}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-sync-deep shadow-sm transition hover:bg-emerald-50"
              >
                Plan groceries <span aria-hidden="true">→</span>
              </button>
              <a
                href="#saved-inventory"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Manage pantry
              </a>
            </div>
          </div>

          <div className="flex items-center gap-6 rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
            <StockRing percent={summary.percent} loading={loading} />
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold">
                {loading ? "—" : summary.totalItems}
              </p>
              <p className="text-sm text-emerald-50/75">tracked items</p>
              <p className="mt-3 text-sm text-emerald-50/75">
                <span className="font-semibold text-white">
                  {loading ? "—" : lowCount}
                </span>{" "}
                running low
              </p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Some summary data could not be loaded. Check the sections below for
          more details.
        </div>
      )}

      {/* Stats */}
      <section aria-labelledby="overview-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sync sm:text-xs">
              Overview
            </p>
            <h2
              id="overview-title"
              className="mt-1 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl"
            >
              This household
            </h2>
          </div>
          <span className="pb-1 text-[11px] text-ink-mute sm:text-xs">
            {loading ? "Updating…" : "Live account data"}
          </span>
        </div>

        <div className="ss-stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile
            label="Pantry items"
            value={loading ? "—" : summary.totalItems}
            detail="Items being tracked"
            icon="▦"
            index={0}
          />
          <StatTile
            label="Running low"
            value={loading ? "—" : lowCount}
            detail={lowCount === 1 ? "Item at threshold" : "Items at threshold"}
            icon="!"
            tone={lowCount > 0 ? "amber" : "green"}
            index={1}
          />
          <StatTile
            label="Purchased"
            value={loading ? "—" : summary.purchased}
            detail="Events this month"
            icon="↗"
            tone="blue"
            index={2}
          />
          <StatTile
            label="Consumed"
            value={loading ? "—" : summary.consumed}
            detail="Events this month"
            icon="✓"
            tone="slate"
            index={3}
          />
        </div>
      </section>

      {/* Attention + quick actions */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-ink sm:text-xl">
                Needs attention
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                Items that have reached their restock threshold.
              </p>
            </div>
            {lowCount > 0 && (
              <span className="rounded-full bg-amber2-soft px-3 py-1 text-xs font-semibold text-amber2">
                {lowCount} {lowCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-ink-soft">Checking your pantry…</p>
          ) : lowCount === 0 ? (
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-sync-soft/60 p-4">
              <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-white text-sync-deep">
                ✓
              </span>
              <p className="text-sm text-sync-deep">
                Nothing needs restocking right now.
              </p>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-line">
              {previewItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-ink-soft">
                      Restock at {item.lowStockThreshold} {item.unit}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-amber2">
                      {item.quantity} {item.unit}
                    </span>
                    <span className="rounded-full bg-alert-soft px-2.5 py-1 text-[11px] font-semibold text-alert">
                      Low
                    </span>
                  </div>
                </li>
              ))}
              {hiddenCount > 0 && (
                <li className="py-3 text-xs text-ink-soft">
                  +{hiddenCount} more in your pantry list below
                </li>
              )}
            </ul>
          )}

          <div className="mt-5 border-t border-line pt-5">
            <LowStockEmailButton disabled={loading || lowCount === 0} />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6">
          <h3 className="font-display text-lg font-bold text-ink sm:text-xl">
            Quick actions
          </h3>

          <button
            type="button"
            onClick={onView}
            className="group flex items-center justify-between rounded-2xl border border-line px-4 py-3.5 text-left transition hover:border-sync hover:bg-sync-soft/50"
          >
            <span>
              <span className="block text-sm font-semibold text-ink">Plan groceries</span>
              <span className="block text-xs text-ink-soft">Build your restock list</span>
            </span>
            <span aria-hidden="true" className="text-sync transition group-hover:translate-x-0.5">→</span>
          </button>

          <a
            href="#saved-inventory"
            className="group flex items-center justify-between rounded-2xl border border-line px-4 py-3.5 transition hover:border-sync hover:bg-sync-soft/50"
          >
            <span>
              <span className="block text-sm font-semibold text-ink">Update pantry</span>
              <span className="block text-xs text-ink-soft">Change quantities and thresholds</span>
            </span>
            <span aria-hidden="true" className="text-sync transition group-hover:translate-y-0.5">↓</span>
          </a>

          <div className="mt-auto rounded-2xl bg-ink p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              Assistant
            </p>
            <p className="mt-1.5 text-sm leading-6 text-slate-300">
              Ask about stock, waste or what to buy next. Use the chat button at the bottom right.
            </p>
          </div>
        </div>
      </section>

      {/* Functional sections */}
      <section id="saved-inventory" className="scroll-mt-5 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sync sm:text-xs">
            Pantry
          </p>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Inventory
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Manage the items you already have at home.
          </p>
        </div>
        <InventoryManager />
      </section>

      <section className="space-y-4">
        <InstamartOrderSync />
      </section>

      <section className="space-y-4">
        <GroceryHistory />
      </section>

      <section className="space-y-4">
        <RestockRecommendations />
      </section>

      <section className="flex flex-col gap-4 rounded-3xl bg-sync-soft/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sync-deep">
            Ready for your next run?
          </p>
          <h2 className="mt-1.5 font-display text-lg font-bold text-ink sm:text-xl">
            Turn your pantry into a plan.
          </h2>
        </div>
        <Button type="button" onClick={onView} className="w-full rounded-xl sm:w-auto">
          Plan groceries <span aria-hidden="true">→</span>
        </Button>
      </section>
    </main>
  );
}
