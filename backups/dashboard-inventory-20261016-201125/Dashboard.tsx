import type { CSSProperties } from "react";
import { INVENTORY } from "@/lib/data";
import { avgCycleDays, purchaseGaps, remainingLabel, statusOf } from "@/lib/predict";
import type { InventoryItem, StockStatus } from "@/lib/types";
import { Button, Card } from "./ui";

const STATUS: Record<StockStatus, { label: string; cls: string; bar: string }> = {
  "restock-soon": { label: "Restock soon", cls: "bg-alert-soft text-alert", bar: "bg-alert" },
  "running-low": { label: "Running low", cls: "bg-amber2-soft text-amber2", bar: "bg-amber2" },
  healthy: { label: "Healthy", cls: "bg-sync-soft text-sync-deep", bar: "bg-sync" },
};

function PredictionCard({ onView }: { onView: () => void }) {
  const milk = INVENTORY[0];
  const gaps = purchaseGaps(milk);
  const purchases = milk.history.filter((h) => h.type === "purchased").length;
  const cycle = avgCycleDays(milk);
  const elapsed = milk.lastPurchaseDaysAgo;
  const scale = 7; // gauge spans 0-7 days
  const pct = (elapsed / scale) * 100;

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-sync-deep p-6 text-white shadow-lift sm:p-8" aria-labelledby="prediction-title">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5" aria-hidden />
      <p id="prediction-title" className="text-sm font-semibold text-white/80">🤖 StockSync AI Prediction</p>
      <h2 className="mt-2 max-w-md font-display text-3xl font-bold leading-tight sm:text-4xl">
        Milk is likely to run out tomorrow.
      </h2>

      {/* Cycle gauge: the visual proof that the prediction comes from history */}
      <div className="mt-7" role="img" aria-label={`${elapsed} days since last purchase, typical cycle ${milk.cycleRange}`}>
        <div className="relative h-3 rounded-full bg-white/15">
          <div className="absolute inset-y-0 rounded-full bg-white/20" style={{ left: `${(4 / scale) * 100}%`, width: `${(2 / scale) * 100}%` }} />
          <div className="absolute inset-y-0 left-0 animate-fill rounded-full bg-white" style={{ "--to": `${pct}%` } as CSSProperties} />
        </div>
        <div className="relative mt-2 h-9 text-xs text-white/75">
          <span className="absolute left-0">Bought {elapsed} days ago</span>
          <span className="absolute -translate-x-1/2 whitespace-nowrap text-center" style={{ left: `${(5 / scale) * 100}%`, top: 18 }}>
            Usual empty point: {milk.cycleRange}
          </span>
        </div>
      </div>

      <div className="mt-2 rounded-2xl bg-white/10 p-4">
        <p className="font-display text-base font-bold">Why?</p>
        <p className="mt-1 text-[15px] leading-relaxed text-white/90">
          You usually consume 1L of milk every 4–6 days.
          <br />
          Your last purchase was 5 days ago.
        </p>
        <p className="mt-3 text-xs text-white/70">
          Learned from {purchases} purchases in your history (cycles of {gaps.join(" and ")} days, average ~{cycle} days).
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80">Prediction confidence</span>
          <span className="flex items-center gap-1.5" aria-label="Medium confidence">
            <span className="h-2 w-5 rounded-full bg-white" />
            <span className="h-2 w-5 rounded-full bg-white" />
            <span className="h-2 w-5 rounded-full bg-white/25" />
            <span className="ml-1 text-sm font-semibold">Medium</span>
          </span>
        </div>
        <Button variant="light" onClick={onView}>View recommendation</Button>
      </div>
    </section>
  );
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const s = STATUS[statusOf(item)];
  const cycle = avgCycleDays(item) || 1;
  const pct = Math.max(6, Math.min(100, (item.daysLeft / cycle) * 100));
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl" aria-hidden>{item.emoji}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span>
      </div>
      <h3 className="mt-3 font-display text-lg font-bold">{item.name}</h3>
      <dl className="mt-1 space-y-0.5 text-sm text-ink-soft">
        <div className="flex justify-between"><dt>Quantity</dt><dd className="font-semibold text-ink">{item.quantity}</dd></div>
        <div className="flex justify-between"><dt>Estimated remaining</dt><dd className="font-semibold text-ink">{remainingLabel(item.daysLeft)}</dd></div>
      </dl>
      <div className="mt-3 h-1.5 rounded-full bg-line" aria-hidden>
        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </Card>
  );
}

function HistoryCard({ item }: { item: InventoryItem }) {
  const cycle = avgCycleDays(item);
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold"><span aria-hidden>{item.emoji}</span>{item.name}</h3>
      {item.historyNote && <p className="mt-1 text-sm text-ink-soft">{item.historyNote}</p>}
      <ol className="mt-3 space-y-0">
        {item.history.map((e, i) => (
          <li key={i} className="relative flex items-center gap-3 py-1.5 pl-5 text-sm">
            <span className={`absolute left-0 h-2.5 w-2.5 rounded-full ${e.type === "purchased" ? "bg-sync" : "border-2 border-ink-mute bg-white"}`} aria-hidden />
            {i < item.history.length - 1 && <span className="absolute left-[4.5px] top-5 h-full w-px bg-line" aria-hidden />}
            <span className="w-14 font-semibold">{e.label}</span>
            <span className="text-ink-soft">{e.type === "purchased" ? `Purchased ${e.qty ?? ""}` : "Consumed"}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 rounded-xl bg-sync-soft px-3 py-2 text-sm font-semibold text-sync-deep">
        {item.id === "eggs" ? `Typical consumption cycle: ~${cycle} days` : `Average consumption cycle: ~${cycle} days`}
      </p>
    </Card>
  );
}

export default function Dashboard({ onView }: { onView: () => void }) {
  const others = INVENTORY.filter((i) => !["milk", "eggs"].includes(i.id));
  return (
    <div className="animate-rise">
      <div className="mt-8">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Good morning 👋</h1>
        <p className="mt-2 text-lg text-ink-soft">Here&apos;s what your household may need soon.</p>
      </div>

      <div className="mt-6"><PredictionCard onView={onView} /></div>

      <section className="mt-10" aria-labelledby="inv-title">
        <h2 id="inv-title" className="font-display text-2xl font-bold">In your kitchen right now</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INVENTORY.map((i) => <InventoryCard key={i.id} item={i} />)}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="hist-title">
        <h2 id="hist-title" className="font-display text-2xl font-bold">What StockSync has learned</h2>
        <p className="mt-1 text-ink-soft">Cycles are worked out from your past purchases. Demo history.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <HistoryCard item={INVENTORY[0]} />
          <HistoryCard item={INVENTORY[1]} />
        </div>
        <Card className="mt-3 p-5">
          <p className="font-display text-base font-bold">Also tracked</p>
          <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
            {others.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2">
                <span><span aria-hidden>{i.emoji}</span> {i.name}</span>
                <span className="font-semibold text-ink-soft">~{avgCycleDays(i)} days</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
