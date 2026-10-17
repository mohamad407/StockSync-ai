"use client";

import { useState, type FormEvent } from "react";
import { useInventory, type SavedInventoryItem } from "@/lib/useInventory";
import { Button, Card } from "./ui";

type InventoryForm = {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  lowStockThreshold: string;
  expiryDate: string;
  notes: string;
};

const initialForm: InventoryForm = {
  name: "",
  category: "",
  quantity: "1",
  unit: "piece",
  lowStockThreshold: "1",
  expiryDate: "",
  notes: "",
};

const fieldClass =
  "w-full min-w-0 rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-sync";

function asForm(item: SavedInventoryItem): InventoryForm {
  return {
    name: item.name,
    category: item.category ?? "",
    quantity: item.quantity,
    unit: item.unit,
    lowStockThreshold: item.lowStockThreshold,
    expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : "",
    notes: item.notes ?? "",
  };
}

function formatDate(value: string) {
  const dateOnly = value.slice(0, 10);
  const date = new Date(`${dateOnly}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString();
}

export default function InventoryManager() {
  const {
    items,
    loading,
    error,
    refresh,
    addItem,
    updateItem,
    deleteItem,
  } = useInventory();

  const [form, setForm] = useState<InventoryForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function changeField<K extends keyof InventoryForm>(
    field: K,
    value: InventoryForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function startEditing(item: SavedInventoryItem) {
    setForm(asForm(item));
    setEditingId(item.id);
    setActionError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setSuccess(null);

    const name = form.name.trim();
    const quantity = Number(form.quantity);
    const lowStockThreshold = Number(form.lowStockThreshold);

    if (!name) {
      setActionError("Enter an item name.");
      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      quantity > 1_000_000_000
    ) {
      setActionError(
        "Quantity must be a number from 0 to 1,000,000,000.",
      );
      return;
    }

    if (
      !Number.isFinite(lowStockThreshold) ||
      lowStockThreshold < 0 ||
      lowStockThreshold > 1_000_000_000
    ) {
      setActionError(
        "Low-stock threshold must be a non-negative number.",
      );
      return;
    }

    if (!form.unit.trim()) {
      setActionError("Choose a unit.");
      return;
    }

    const input = {
      name,
      category: form.category.trim() || null,
      quantity,
      unit: form.unit.trim(),
      lowStockThreshold,
      expiryDate: form.expiryDate || null,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId) {
        await updateItem(editingId, input);
        setSuccess(`${name} was updated and saved.`);
      } else {
        await addItem(input);
        setSuccess(`${name} was added to your saved inventory.`);
      }

      resetForm();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to save this item.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: SavedInventoryItem) {
    const confirmed = window.confirm(
      `Delete ${item.name} from your inventory? This cannot be undone.`,
    );

    if (!confirmed) return;

    setActionError(null);
    setSuccess(null);

    try {
      await deleteItem(item.id);

      if (editingId === item.id) {
        resetForm();
      }

      setSuccess(`${item.name} was deleted from your inventory.`);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to delete this item.",
      );
    }
  }

  return (
    <section
      className="mt-8"
      aria-labelledby="inventory-overview-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="inventory-overview-title"
            className="font-display text-2xl font-bold"
          >
            Your saved inventory
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Add and manage household stock. Changes are saved to your account.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => void refresh()}
          disabled={loading || saving}
        >
          {loading ? "Loading..." : "Refresh inventory"}
        </Button>
      </div>

      <Card className="mt-4 p-5">
        <h3 className="font-display text-lg font-bold">
          {editingId ? "Edit inventory item" : "Add an inventory item"}
        </h3>

        <form
          onSubmit={handleSubmit}
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          <label className="grid gap-1.5 text-sm font-semibold">
            Item name *
            <input
              required
              maxLength={120}
              value={form.name}
              onChange={(event) =>
                changeField("name", event.target.value)
              }
              placeholder="e.g. Milk"
              className={fieldClass}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Category
            <input
              maxLength={80}
              value={form.category}
              onChange={(event) =>
                changeField("category", event.target.value)
              }
              placeholder="e.g. Dairy"
              className={fieldClass}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Quantity *
            <input
              required
              type="number"
              min="0"
              max="1000000000"
              step="any"
              value={form.quantity}
              onChange={(event) =>
                changeField("quantity", event.target.value)
              }
              className={fieldClass}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Unit *
            <select
              required
              value={form.unit}
              onChange={(event) =>
                changeField("unit", event.target.value)
              }
              className={fieldClass}
            >
              {[
                "piece",
                "pack",
                "bottle",
                "box",
                "kg",
                "g",
                "L",
                "mL",
                "dozen",
              ].map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Low-stock threshold *
            <input
              required
              type="number"
              min="0"
              max="1000000000"
              step="any"
              value={form.lowStockThreshold}
              onChange={(event) =>
                changeField("lowStockThreshold", event.target.value)
              }
              className={fieldClass}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Expiry date
            <input
              type="date"
              value={form.expiryDate}
              onChange={(event) =>
                changeField("expiryDate", event.target.value)
              }
              className={fieldClass}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
            Notes
            <textarea
              maxLength={1000}
              rows={2}
              value={form.notes}
              onChange={(event) =>
                changeField("notes", event.target.value)
              }
              placeholder="Optional details, brand, storage location, etc."
              className={`${fieldClass} resize-y`}
            />
          </label>

          {(actionError || error) && (
            <div
              role="alert"
              className="rounded-xl border border-alert/30 bg-alert-soft p-3 text-sm text-alert sm:col-span-2"
            >
              {actionError || error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl bg-sync-soft p-3 text-sm font-medium text-sync-deep sm:col-span-2"
            >
              {success}
            </div>
          )}

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Add to inventory"}
            </Button>

            {editingId && (
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold">Saved items</h3>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink-soft">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      {loading && (
        <Card className="mt-3 p-5 text-sm text-ink-soft">
          Loading your saved inventory...
        </Card>
      )}

      {!loading && error && (
        <Card className="mt-3 p-5">
          <p className="font-semibold text-alert">
            Unable to load your inventory.
          </p>
          <p className="mt-2 break-words text-sm text-ink-soft">
            {error}
          </p>
          <Button
            type="button"
            className="mt-3"
            variant="ghost"
            onClick={() => void refresh()}
          >
            Try again
          </Button>
        </Card>
      )}

      {!loading && !error && items.length === 0 && (
        <Card className="mt-3 p-5">
          <h4 className="font-display text-lg font-bold">
            Your inventory is empty
          </h4>
          <p className="mt-2 text-sm text-ink-soft">
            Add the groceries you currently have at home. Only items you save
            will appear here.
          </p>
        </Card>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const quantity = Number(item.quantity);
            const threshold = Number(item.lowStockThreshold);
            const isLow =
              Number.isFinite(quantity) &&
              Number.isFinite(threshold) &&
              quantity <= threshold;

            return (
              <Card className="p-4" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="break-words font-display text-lg font-bold">
                      {item.name}
                    </h4>

                    {item.category && (
                      <p className="mt-1 text-sm text-ink-soft">
                        {item.category}
                      </p>
                    )}
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isLow
                        ? "bg-alert-soft text-alert"
                        : "bg-sync-soft text-sync-deep"
                    }`}
                  >
                    {isLow ? "Low stock" : "In stock"}
                  </span>
                </div>

                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Quantity</dt>
                    <dd className="text-right font-semibold">
                      {item.quantity} {item.unit}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Restock at</dt>
                    <dd className="text-right font-semibold">
                      {item.lowStockThreshold} {item.unit}
                    </dd>
                  </div>

                  {item.expiryDate && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-soft">Expiry</dt>
                      <dd className="text-right font-semibold">
                        {formatDate(item.expiryDate)}
                      </dd>
                    </div>
                  )}
                </dl>

                {item.notes && (
                  <p className="mt-3 break-words text-sm text-ink-soft">
                    {item.notes}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => startEditing(item)}
                  >
                    Edit
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handleDelete(item)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
