export type Priority = "high" | "medium" | "low";
export type StockStatus = "restock-soon" | "running-low" | "healthy";

export interface HistoryEvent {
  /** Display label, e.g. "May 1" */
  label: string;
  /** Day offset used to compute cycles (May 1 = day 1). Demo data only. */
  day: number;
  type: "purchased" | "consumed";
  qty?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  emoji: string;
  quantity: string;
  /** Predicted days until the item runs out */
  daysLeft: number;
  /** Human range shown in the "why" copy, e.g. "4-6 days" */
  cycleRange?: string;
  lastPurchaseDaysAgo: number;
  history: HistoryEvent[];
  /** Short unit note for the history section, e.g. "Purchased: 12" */
  historyNote?: string;
}

export interface Product {
  id: string;
  itemId: string;
  name: string;
  brand: string;
  size: string;
  price: number;
  emoji: string;
  preferred?: boolean;
  note: string;
}

export interface CartLine {
  product: Product;
  qty: number;
}

export interface Cart {
  id: string;
  lines: CartLine[];
  total: number;
}
