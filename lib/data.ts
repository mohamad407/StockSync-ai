import type { InventoryItem } from "./types";

// Demo data only. In a real product this would come from the user's purchase
// and consumption history (database), not from a static file.
export const INVENTORY: InventoryItem[] = [
  {
    id: "milk",
    name: "Milk",
    emoji: "🥛",
    quantity: "1 L",
    daysLeft: 1,
    cycleRange: "4-6 days",
    lastPurchaseDaysAgo: 5,
    history: [
      { label: "May 1", day: 1, type: "purchased", qty: "1 L" },
      { label: "May 5", day: 5, type: "consumed" },
      { label: "May 6", day: 6, type: "purchased", qty: "1 L" },
      { label: "May 10", day: 10, type: "consumed" },
      { label: "May 11", day: 11, type: "purchased", qty: "1 L" },
    ],
  },
  {
    id: "eggs",
    name: "Eggs",
    emoji: "🥚",
    quantity: "6",
    daysLeft: 3,
    lastPurchaseDaysAgo: 5,
    historyNote: "Purchased: 12",
    history: [
      { label: "Apr 20", day: -10, type: "purchased", qty: "12" },
      { label: "Apr 28", day: -2, type: "purchased", qty: "12" },
      { label: "May 6", day: 6, type: "purchased", qty: "12" },
    ],
  },
  {
    id: "bread",
    name: "Bread",
    emoji: "🍞",
    quantity: "1 loaf",
    daysLeft: 4,
    lastPurchaseDaysAgo: 1,
    history: [
      { label: "Apr 27", day: -3, type: "purchased", qty: "1 loaf" },
      { label: "May 1", day: 1, type: "purchased", qty: "1 loaf" },
      { label: "May 5", day: 5, type: "purchased", qty: "1 loaf" },
      { label: "May 9", day: 9, type: "purchased", qty: "1 loaf" },
    ],
  },
  {
    id: "rice",
    name: "Rice",
    emoji: "🍚",
    quantity: "4 kg",
    daysLeft: 21,
    lastPurchaseDaysAgo: 9,
    history: [
      { label: "Apr 10", day: -21, type: "purchased", qty: "5 kg" },
      { label: "May 10", day: 9, type: "purchased", qty: "5 kg" },
    ],
  },
  {
    id: "detergent",
    name: "Detergent",
    emoji: "🧴",
    quantity: "1 bottle",
    daysLeft: 12,
    lastPurchaseDaysAgo: 33,
    history: [
      { label: "Mar 26", day: -36, type: "purchased", qty: "1 bottle" },
      { label: "May 10", day: 9, type: "purchased", qty: "1 bottle" },
    ],
  },
];
