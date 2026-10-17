import type { InventoryItem, Priority, StockStatus } from "./types";
import { INVENTORY } from "./data";

/** Average gap (in days) between purchases, learned from history. */
export function avgCycleDays(item: InventoryItem): number {
  const days = item.history.filter((e) => e.type === "purchased").map((e) => e.day);
  if (days.length < 2) return 0;
  const gaps = days.slice(1).map((d, i) => d - days[i]);
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

export function purchaseGaps(item: InventoryItem): number[] {
  const days = item.history.filter((e) => e.type === "purchased").map((e) => e.day);
  return days.slice(1).map((d, i) => d - days[i]);
}

export function statusOf(item: InventoryItem): StockStatus {
  if (item.daysLeft <= 1) return "restock-soon";
  if (item.daysLeft <= 4) return "running-low";
  return "healthy";
}

export function priorityOf(item: InventoryItem): Priority {
  if (item.daysLeft <= 1) return "high";
  if (item.daysLeft <= 4) return "medium";
  return "low";
}

export function remainingLabel(days: number): string {
  if (days <= 1) return "1 day";
  return `${days} days`;
}

export function runOutPhrase(days: number): string {
  if (days <= 1) return "Likely to run out tomorrow";
  return `Likely to run out in ~${days} days`;
}

/** Items that need restocking, most urgent first. */
export function restockPlan(): InventoryItem[] {
  return INVENTORY.filter((i) => priorityOf(i) !== "low").sort((a, b) => a.daysLeft - b.daysLeft);
}

export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
