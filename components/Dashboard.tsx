"use client";

import { useMemo } from "react";
import { useInventory } from "@/lib/useInventory";
import { useHistory } from "@/lib/useHistory";
import { Card, Button } from "./ui";
import GroceryHistory from "./GroceryHistory";
import InventoryManager from "./InventoryManager";
import InstamartOrderSync from "./InstamartOrderSync";
import RestockRecommendations from "./RestockRecommendations";

function StatCard({
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
  tone?: "green" | "amber" | "blue";
  index?: number;
}) {
  const toneClasses = {
    green: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    blue: "bg-sky-50 text-sky-800 ring-sky-100",
  };

  return (
    <article
      className="ss-card animate-rise min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
          {label}
        </p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ring-1 ${toneClasses[tone]}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      <p className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-950 sm:mt-5 sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
        {detail}
      </p>
    </article>
  );
}

export default function Dashboard({ onView }: { onView: () => void }) {
  const inventory = useInventory();
  const history = useHistory();

  const summary = useMemo(() => {
    const lowStock = inventory.items.filter((item) => {
      const quantity = Number(item.quantity);
      const threshold = Number(item.lowStockThreshold);

      return (
        Number.isFinite(quantity) &&
        Number.isFinite(threshold) &&
        quantity <= threshold
      );
    }).length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonth = history.events.filter((event) => {
      const date = new Date(event.eventDate);
      return (
        !Number.isNaN(date.getTime()) &&
        date >= monthStart &&
        date <= now
      );
    });

    return {
      totalItems: inventory.items.length,
      lowStock,
      purchased: thisMonth.filter(
        (event) => event.eventType === "purchased"
      ).length,
      consumed: thisMonth.filter(
        (event) => event.eventType === "consumed"
      ).length,
    };
  }, [inventory.items, history.events]);

  const loading = inventory.loading || history.loading;
  const error = inventory.error || history.error;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <main className="space-y-8 pb-8 pt-5 sm:space-y-10 sm:pt-8">
      {/* Compact welcome area */}
      <section className="ss-animate-in relative isolate overflow-hidden rounded-3xl bg-[#075640] p-5 text-white shadow-[0_18px_50px_-24px_rgba(7,86,64,0.65)] sm:rounded-[2rem] sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full border border-white/10 sm:h-80 sm:w-80"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-5 top-12 -z-10 h-36 w-36 rounded-full bg-emerald-300/10 blur-3xl sm:right-20"
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-50">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
            Your pantry, in sync
          </span>
          <span className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/75">
            {loading ? "Syncing data" : "Personal dashboard"}
          </span>
        </div>

        <div className="mt-6 grid items-end gap-7 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-emerald-100/80">
              {greeting} 👋
            </p>
            <h1 className="mt-2 max-w-xl font-display text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-5xl">
              Less waste.
              <br className="hidden sm:block" /> More in sync.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-emerald-50/80 sm:text-base sm:leading-7">
              Know what is in your pantry, spot what is running low, and plan
              your next grocery run with confidence.
            </p>

            <div className="mt-6 flex flex-col gap-3 min-[420px]:flex-row">
              <button
                type="button"
                onClick={onView}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#075640] shadow-sm hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white min-[420px]:w-auto"
              >
                Plan groceries <span aria-hidden="true">↗</span>
              </button>

              <a
                href="#saved-inventory"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 min-[420px]:w-auto"
              >
                Manage pantry <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          <div className="hidden min-w-40 rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm lg:block">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100/70">
              Pantry status
            </p>
            <p className="mt-3 font-display text-4xl font-bold">
              {loading ? "—" : summary.totalItems}
            </p>
            <p className="mt-1 text-sm text-emerald-50/75">tracked items</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-300 transition-all duration-700"
                style={{
                  width: loading
                    ? "12%"
                    : summary.totalItems === 0
                      ? "0%"
                      : `${Math.min(100, Math.max(12, summary.totalItems * 12))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section aria-labelledby="overview-title">
        <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 sm:text-xs">
              Your household
            </p>
            <h2
              id="overview-title"
              className="mt-1 font-display text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
            >
              The big picture
            </h2>
          </div>
          <span className="pb-1 text-right text-[11px] text-slate-500 sm:text-xs">
            {loading ? "Updating…" : "Live account data"}
          </span>
        </div>

        {error && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            Some summary data could not be loaded. Check the sections below
            for more details.
          </div>
        )}

        <div className="ss-stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Pantry items"
            value={loading ? "—" : summary.totalItems}
            detail="Items being tracked"
            icon="▦"
            index={0}
          />
          <StatCard
            label="Running low"
            value={loading ? "—" : summary.lowStock}
            detail={
              summary.lowStock === 1
                ? "Item needs attention"
                : "Items need attention"
            }
            icon="!"
            tone={summary.lowStock > 0 ? "amber" : "green"}
            index={1}
          />
          <StatCard
            label="Purchased"
            value={loading ? "—" : summary.purchased}
            detail="Events this month"
            icon="↗"
            tone="blue"
            index={2}
          />
          <StatCard
            label="Consumed"
            value={loading ? "—" : summary.consumed}
            detail="Events this month"
            icon="✓"
            index={3}
          />
        </div>
      </section>

      {/* Action cards */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="ss-card relative overflow-hidden p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-800">
              🥬
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                Start here
              </p>
              <h3 className="mt-1 font-display text-lg font-bold text-slate-950 sm:text-xl">
                Keep your pantry current
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Update quantities and record what your household uses to
                improve restock recommendations.
              </p>
              <a
                href="#saved-inventory"
                className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950"
              >
                Update inventory <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </Card>

        <Card className="ss-card relative overflow-hidden bg-slate-950 p-5 text-white sm:p-6">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-emerald-500/15 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
              ✦
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                StockSync intelligence
              </p>
              <h3 className="mt-1 font-display text-lg font-bold sm:text-xl">
                Make smarter grocery decisions
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Ask the AI assistant about your stock, potential waste, or
                grocery planning using the data available to your account.
              </p>
              <p className="mt-4 text-xs text-slate-400">
                Open the assistant using the chat control at the bottom of
                your screen.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Existing functional features */}
      <section id="saved-inventory" className="scroll-mt-5 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 sm:text-xs">
              Your essentials
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              Pantry inventory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage the items you already have at home.
            </p>
          </div>
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

      {/* Final call to action */}
      <section className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-7">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">
            Ready for your next run?
          </p>
          <h2 className="mt-2 font-display text-xl font-bold text-slate-950">
            Turn your pantry into a plan.
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Continue to shopping to plan your next grocery run.
          </p>
        </div>
        <Button
          type="button"
          onClick={onView}
          className="mt-5 w-full shrink-0 rounded-xl sm:mt-0 sm:w-auto"
        >
          Plan groceries <span aria-hidden="true">→</span>
        </Button>
      </section>
    </main>
  );
}
