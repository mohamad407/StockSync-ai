import type { CSSProperties } from "react";
import { useState } from "react";
import { INVENTORY } from "@/lib/data";
import { useInventory, type SavedInventoryItem } from "@/lib/useInventory";
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


function SavedInventoryManager() {
  const { items, loading, error, addItem, updateItem, deleteItem, refresh } = useInventory();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("piece");
  const [threshold, setThreshold] = useState("1");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setCategory("");
    setQuantity("1");
    setUnit("piece");
    setThreshold("1");
    setExpiryDate("");
    setNotes("");
    setEditingId(null);
    setActionError(null);
  }

  function startEditing(item: SavedInventoryItem) {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category ?? "");
    setQuantity(item.quantity);
    setUnit(item.unit);
    setThreshold(item.lowStockThreshold);
    setExpiryDate(item.expiryDate ? item.expiryDate.slice(0, 10) : "");
    setNotes(item.notes ?? "");
    setActionError(null);
    document.getElementById("saved-inventory-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);

    const parsedQuantity = Number(quantity);
    const parsedThreshold = Number(threshold);

    if (!name.trim()) {
      setActionError("Enter an item name.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setActionError("Quantity must be a valid number greater than or equal to zero.");
      return;
    }
    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
      setActionError("Low-stock threshold must be a valid non-negative number.");
      return;
    }

    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        category: category.trim() || null,
        quantity: parsedQuantity,
        unit: unit.trim() || "piece",
        lowStockThreshold: parsedThreshold,
        expiryDate: expiryDate || null,
        notes: notes.trim() || null,
      };

      if (editingId) {
        await updateItem(editingId, input);
      } else {
        await addItem(input);
      }
      resetForm();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unable to save this inventory item.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: SavedInventoryItem) {
    if (!window.confirm(`Delete "${item.name}" from your saved inventory?`)) return;

    setActionError(null);
    try {
      await deleteItem(item.id);
      if (editingId === item.id) resetForm();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unable to delete this item.",
      );
    }
  }

  return (
    <section className="mt-10" aria-labelledby="saved-inventory-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="saved-inventory-title" className="font-display text-2xl font-bold">
            Your saved inventory
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Items saved to your account, separate from demo prediction history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:bg-paper disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {(error || actionError) && (
        <div role="alert" className="mt-4 rounded-2xl border border-alert/30 bg-alert-soft p-3 text-sm text-alert">
          {actionError || error}
        </div>
      )}

      <Card className="mt-4 p-5">
        <h3 className="font-display text-lg font-bold">
          {editingId ? "Edit inventory item" : "Add an inventory item"}
        </h3>

        <form id="saved-inventory-form" onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">
            Item name *
            <input
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Milk"
              className="min-w-0 rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:border-sync"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Category
            <input
              maxLength={80}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="e.g. Dairy"
              className="min-w-0 rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:border-sync"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Quantity *
            <input
              required
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="min-w-0 rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:border-sync"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Unit *
            <select
              required
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              className="min-w-0 rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-sync"
            >
              {["piece", "pack", "bottle", "box", "kg", "g", "L", "mL", "dozen"].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Low-stock alert at
            <input
              type="number"
              min="0"
              step="any"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              className="min-w-0 rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:border-sync"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Expiry date
            <input
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              className="min-w-0 rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:border-sync"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
            Notes
            <textarea
              maxLength={1000}
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes"
              className="min-w-0 resize-y rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:border-sync"
            />
          </label>

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add item"}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {loading && (
          <Card className="p-5 text-sm text-ink-soft">
            Loading your saved inventory...
          </Card>
        )}

        {!loading && !error && items.length === 0 && (
          <Card className="p-5 text-sm text-ink-soft sm:col-span-2">
            No saved items yet. Add your first item using the form above.
          </Card>
        )}

        {items.map((item) => {
          const low = Number(item.quantity) <= Number(item.lowStockThreshold);
          return (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-display text-lg font-bold">{item.name}</h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {item.category || "Uncategorised"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${low ? "bg-amber2-soft text-amber2" : "bg-sync-soft text-sync-deep"}`}>
                  {low ? "Low stock" : "In stock"}
                </span>
              </div>

              <p className="mt-3 text-sm">
                Quantity: <strong>{item.quantity} {item.unit}</strong>
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Alert threshold: {item.lowStockThreshold} {item.unit}
              </p>
              {item.expiryDate && (
                <p className="mt-1 text-xs text-ink-soft">
                  Expiry: {item.expiryDate.slice(0, 10)}
                </p>
              )}
              {item.notes && (
                <p className="mt-2 break-words text-sm text-ink-soft">{item.notes}</p>
              )}

              <div className="mt-4 flex gap-2">
                <Button type="button" variant="ghost" className="flex-1 px-3 py-2 text-sm" onClick={() => startEditing(item)}>
                  Edit
                </Button>
                <Button type="button" variant="ghost" className="flex-1 px-3 py-2 text-sm" onClick={() => void handleDelete(item)}>
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
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

      <SavedInventoryManager />
    </div>
  );
}
