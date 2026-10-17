"use client";

import { useMemo } from "react";
import { useInventory } from "@/lib/useInventory";
import { useHistory } from "@/lib/useHistory";
import { Card, Button } from "./ui";

const DAY_MS = 24 * 60 * 60 * 1000;

type Forecast = {
  dailyUsage: number;
  daysUntilThreshold: number;
  observationDays: number;
  consumptionEvents: number;
};

function getForecast(
  itemName: string,
  unit: string,
  quantity: number,
  threshold: number,
  events: ReturnType<typeof useHistory>["events"],
): Forecast | null {
  const normalizedName = itemName.trim().toLowerCase();
  const normalizedUnit = unit.trim().toLowerCase();

  const matching = events
    .filter(
      (event) =>
        event.eventType === "consumed" &&
        event.itemName.trim().toLowerCase() === normalizedName &&
        event.unit.trim().toLowerCase() === normalizedUnit,
    )
    .map((event) => ({
      quantity: Number(event.quantity),
      date: new Date(event.eventDate),
    }))
    .filter(
      (event) =>
        Number.isFinite(event.quantity) &&
        event.quantity > 0 &&
        !Number.isNaN(event.date.getTime()),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Avoid pretending a few events from the same day establish a usage rate.
  if (matching.length < 3) return null;

  const first = matching[0].date;
  const last = matching[matching.length - 1].date;

  const observationDays = Math.floor(
    (last.getTime() - first.getTime()) / DAY_MS,
  );

  if (observationDays < 7) return null;

  const distinctDays = new Set(
    matching.map((event) => event.date.toISOString().slice(0, 10)),
  );

  if (distinctDays.size < 3) return null;

  const totalConsumed = matching.reduce(
    (total, event) => total + event.quantity,
    0,
  );

  const dailyUsage = totalConsumed / observationDays;

  if (!Number.isFinite(dailyUsage) || dailyUsage <= 0) {
    return null;
  }

  return {
    dailyUsage,
    daysUntilThreshold: Math.max(
      0,
      (quantity - threshold) / dailyUsage,
    ),
    observationDays,
    consumptionEvents: matching.length,
  };
}

function formatDays(days: number) {
  if (days <= 1) return "within about 1 day";
  return `in about ${Math.ceil(days)} days`;
}

export default function RestockRecommendations() {
  const inventory = useInventory();
  const history = useHistory();

  const lowStockItems = useMemo(
    () =>
      inventory.items.filter((item) => {
        const quantity = Number(item.quantity);
        const threshold = Number(item.lowStockThreshold);

        return (
          Number.isFinite(quantity) &&
          Number.isFinite(threshold) &&
          quantity <= threshold
        );
      }),
    [inventory.items],
  );

  const forecasts = useMemo(
    () =>
      inventory.items
        .map((item) => {
          const quantity = Number(item.quantity);
          const threshold = Number(item.lowStockThreshold);

          if (
            !Number.isFinite(quantity) ||
            !Number.isFinite(threshold) ||
            quantity <= threshold
          ) {
            return null;
          }

          const forecast = getForecast(
            item.name,
            item.unit,
            quantity,
            threshold,
            history.events,
          );

          return forecast ? { item, forecast } : null;
        })
        .filter(
          (
            value,
          ): value is NonNullable<typeof value> => value !== null,
        )
        .sort(
          (a, b) =>
            a.forecast.daysUntilThreshold -
            b.forecast.daysUntilThreshold,
        ),
    [inventory.items, history.events],
  );

  const loading = inventory.loading || history.loading;
  const error = inventory.error || history.error;

  return (
    <section
      className="mt-8"
      aria-labelledby="restock-recommendations-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="restock-recommendations-title"
            className="font-display text-2xl font-bold"
          >
            Restock recommendations
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Based on your saved inventory and manually recorded consumption.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            void inventory.refresh();
            void history.refresh();
          }}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh recommendations"}
        </Button>
      </div>

      {loading && (
        <Card className="mt-4 p-5 text-sm text-ink-soft">
          Loading saved inventory and consumption history...
        </Card>
      )}

      {!loading && error && (
        <Card className="mt-4 p-5">
          <p className="font-semibold text-alert">
            Recommendations could not be calculated.
          </p>
          <p className="mt-2 break-words text-sm text-ink-soft">
            {error}
          </p>
        </Card>
      )}

      {!loading && !error && inventory.items.length === 0 && (
        <Card className="mt-4 p-5">
          Add your current groceries to inventory before calculating
          restock recommendations.
        </Card>
      )}

      {!loading && !error && inventory.items.length > 0 && (
        <>
          {lowStockItems.length > 0 && (
            <div className="mt-4">
              <h3 className="font-display text-lg font-bold">
                Restock now
              </h3>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {lowStockItems.map((item) => (
                  <Card className="p-4" key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h4 className="font-display text-lg font-bold">
                        {item.name}
                      </h4>
                      <span className="rounded-full bg-alert-soft px-2.5 py-1 text-xs font-semibold text-alert">
                        Low stock
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-ink-soft">
                      Current quantity
                    </p>
                    <p className="mt-1 font-semibold">
                      {item.quantity} {item.unit}
                    </p>

                    <p className="mt-2 text-sm text-ink-soft">
                      Restock threshold: {item.lowStockThreshold}{" "}
                      {item.unit}
                    </p>

                    <p className="mt-3 text-sm">
                      Your saved quantity has reached the threshold.
                      Consider replenishing this item.
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {forecasts.length > 0 && (
            <div className="mt-6">
              <h3 className="font-display text-lg font-bold">
                Estimated upcoming restocks
              </h3>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {forecasts.map(({ item, forecast }) => (
                  <Card className="p-4" key={item.id}>
                    <h4 className="font-display text-lg font-bold">
                      {item.name}
                    </h4>

                    <p className="mt-3 text-sm text-ink-soft">
                      Estimated time until the restock threshold
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {formatDays(forecast.daysUntilThreshold)}
                    </p>

                    <p className="mt-3 text-sm">
                      Average recorded consumption:{" "}
                      <strong>
                        {forecast.dailyUsage.toFixed(2)} {item.unit}/day
                      </strong>
                    </p>

                    <p className="mt-2 text-xs text-ink-soft">
                      Calculated from {forecast.consumptionEvents} manually
                      recorded consumption events across{" "}
                      {forecast.observationDays} days.
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {lowStockItems.length === 0 && forecasts.length === 0 && (
            <Card className="mt-4 p-5">
              <h3 className="font-display text-lg font-bold">
                More consumption history is needed
              </h3>
              <p className="mt-2 text-sm text-ink-soft">
                No item has reached its restock threshold, and there is not
                enough dated consumption history to estimate upcoming
                restocks. Continue recording actual consumption events
                manually using the same item name and unit.
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                A forecast requires at least three consumption events across
                at least three different dates spanning seven or more days.
                It is an estimate, not a guarantee.
              </p>
            </Card>
          )}
        </>
      )}

      <p className="mt-3 text-xs text-ink-soft">
        Recommendations use saved quantities and manually entered history.
        No grocery purchase history is automatically imported, and no
        product prices or stock levels are invented.
      </p>
    </section>
  );
}
