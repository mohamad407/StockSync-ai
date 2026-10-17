"use client";

import { useState } from "react";
import { useHistory, type GroceryEventType } from "@/lib/useHistory";
import { Button, Card } from "./ui";

function localDateInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatEventDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function GroceryHistory() {
  const {
    events,
    loading,
    saving,
    error,
    refresh,
    recordEvent,
  } = useHistory();

  const [itemName, setItemName] = useState("");
  const [eventType, setEventType] = useState<GroceryEventType>("purchased");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("piece");
  const [eventDate, setEventDate] = useState(localDateInputValue);
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setFormError(null);
    setSuccess(null);

    const parsedQuantity = Number(quantity);
    const parsedPrice = unitPrice.trim() === "" ? null : Number(unitPrice);

    if (!itemName.trim()) {
      setFormError("Enter the grocery item name.");
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setFormError("Quantity must be greater than zero.");
      return;
    }

    if (!unit.trim()) {
      setFormError("Choose a unit.");
      return;
    }

    if (!eventDate) {
      setFormError("Choose the event date.");
      return;
    }

    if (eventType === "purchased" && parsedPrice !== null &&
      (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setFormError("Unit price must be zero or greater.");
      return;
    }

    const isToday = eventDate === localDateInputValue();

    if (!eventDate || eventDate > localDateInputValue()) {
      setFormError("Choose a valid date that is not in the future.");
      return;
    }

    // Today's event uses the actual current time; past dates remain historical.
    const selectedDate = isToday
      ? new Date()
      : new Date(`${eventDate}T12:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      setFormError("Choose a valid event date.");
      return;
    }

    try {
      const savedEvent = await recordEvent({
        itemName: itemName.trim(),
        eventType,
        quantity: parsedQuantity,
        unit: unit.trim(),
        eventDate: selectedDate.toISOString(),
        unitPrice: eventType === "purchased" ? parsedPrice : null,
        notes: notes.trim() || null,
        applyToInventory: isToday,
      });

      const eventLabel =
        `${itemName.trim()} ${eventType === "purchased" ? "purchase" : "consumption"}`;

      if (!savedEvent.inventoryReconciled) {
        setSuccess(`${eventLabel} recorded as historical data. Current stock was not changed.`);
      } else if (!savedEvent.inventoryAdjusted && savedEvent.stockShortfall) {
        setSuccess(`${eventLabel} recorded, but no matching inventory item was found. Current stock was not changed.`);
      } else if (savedEvent.stockShortfall) {
        setSuccess(`${eventLabel} recorded. The saved stock was insufficient, so its quantity was set to zero.`);
      } else if (savedEvent.inventoryAdjusted) {
        setSuccess(`${eventLabel} recorded and inventory quantity updated.`);
      } else {
        setSuccess(`${eventLabel} recorded. Inventory was not changed.`);
      }
      setItemName("");
      setQuantity("1");
      setUnitPrice("");
      setNotes("");
      setEventDate(localDateInputValue());
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to save this event.",
      );
    }
  }

  return (
    <section className="mt-10" aria-labelledby="grocery-history-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="grocery-history-title"
            className="font-display text-2xl font-bold"
          >
            Your grocery history
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Record what you buy and consume to build your own restock history.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => void refresh()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh history"}
        </Button>
      </div>

      <Card className="mt-4 p-5">
        <h3 className="font-display text-lg font-bold">Record a grocery event</h3>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">
            Grocery item *
            <input
              required
              maxLength={120}
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              placeholder="e.g. Milk"
              className="min-w-0 rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:border-sync"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Event type *
            <select
              value={eventType}
              onChange={(event) => setEventType(event.target.value as GroceryEventType)}
              className="min-w-0 rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-sync"
            >
              <option value="purchased">Purchased</option>
              <option value="consumed">Consumed</option>
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            Quantity *
            <input
              required
              type="number"
              min="0.001"
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
            Date *
            <input
              required
              type="date"
              max={localDateInputValue()}
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="min-w-0 rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:border-sync"
            />
          </label>

          {eventType === "purchased" && (
            <label className="grid gap-1.5 text-sm font-semibold">
              Unit price (optional, ₹)
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                placeholder="e.g. 30.00"
                className="min-w-0 rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:border-sync"
              />
            </label>
          )}

          <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
            Notes (optional)
            <textarea
              maxLength={1000}
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional details"
              className="min-w-0 resize-y rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:border-sync"
            />
          </label>

          {(formError || error) && (
            <div
              role="alert"
              className="rounded-xl border border-alert/30 bg-alert-soft p-3 text-sm text-alert sm:col-span-2"
            >
              {formError || error}
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

          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : `Record ${eventType === "purchased" ? "purchase" : "consumption"}`}
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold">Recorded events</h3>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink-soft">
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </div>

      {loading && (
        <Card className="mt-3 p-5 text-sm text-ink-soft">
          Loading your history...
        </Card>
      )}

      {!loading && !error && events.length === 0 && (
        <Card className="mt-3 p-5 text-sm text-ink-soft">
          No saved grocery events yet. Record your first purchase or consumption
          above. These entries will build your personal history.
        </Card>
      )}

      {!loading && events.length > 0 && (
        <ol className="mt-3 grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <Card className="h-full p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="break-words font-display text-lg font-bold">
                      {event.itemName}
                    </h4>
                    <p className="mt-1 text-xs text-ink-soft">
                      {formatEventDate(event.eventDate)}
                    </p>

                    {event.source === "instamart" && (
                      <p className="mt-1 text-xs font-semibold text-sync-deep">
                        Imported from Instamart
                        {event.externalOrderId
                          ? ` · Order ${event.externalOrderId}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      event.eventType === "purchased"
                        ? "bg-sync-soft text-sync-deep"
                        : "bg-paper text-ink-soft"
                    }`}
                  >
                    {event.eventType === "purchased" ? "Purchased" : "Consumed"}
                  </span>
                </div>

                <p className="mt-3 text-sm">
                  Quantity: <strong>{event.quantity} {event.unit}</strong>
                </p>

                {event.eventType === "purchased" && event.unitPrice !== null && (
                  <p className="mt-1 text-sm">
                    Unit price: <strong>₹{Number(event.unitPrice).toFixed(2)}</strong>
                  </p>
                )}

                {event.notes && (
                  <p className="mt-2 break-words text-sm text-ink-soft">
                    {event.notes}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}


