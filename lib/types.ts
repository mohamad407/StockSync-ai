export type Priority = "high" | "medium" | "low";
export type StockStatus = "restock-soon" | "running-low" | "healthy";

export interface HistoryEvent {
  label: string;
  day: number;
  type: "purchased" | "consumed";
  qty?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  emoji: string;
  quantity: string;
  daysLeft: number;
  cycleRange?: string;
  lastPurchaseDaysAgo: number;
  history: HistoryEvent[];
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

  // Optional live Instamart product details.
  imageUrl?: string;
  mrp?: number;
  inStock?: boolean;
  maxQuantity?: number;
  rating?: string;
  ratingCount?: string;
  deliveryTime?: string;
  spinId?: string;
  skuId?: string;
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
