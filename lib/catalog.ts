import type { Product } from "./types";

// Demo product catalog. Names, sizes and prices are illustrative only and do
// NOT reflect real Instamart listings or prices.
export const CATALOG: Record<string, Product[]> = {
  milk: [
    { id: "milk-amul-taaza", itemId: "milk", name: "Amul Taaza Homogenised Toned Milk", brand: "Amul", size: "1 L", price: 56, emoji: "🥛", preferred: true, note: "Your usual pick" },
    { id: "milk-amul-gold", itemId: "milk", name: "Amul Gold Milk", brand: "Amul", size: "1 L", price: 68, emoji: "🥛", note: "Richer, full cream" },
    { id: "milk-nandini", itemId: "milk", name: "Nandini Toned Milk", brand: "Nandini", size: "1 L", price: 54, emoji: "🥛", note: "Lowest price" },
  ],
  eggs: [
    { id: "eggs-farm-12", itemId: "eggs", name: "Farm Fresh White Eggs", brand: "Farm Fresh", size: "12 eggs", price: 96, emoji: "🥚", preferred: true, note: "Matches your 12-pack habit" },
    { id: "eggs-brown-12", itemId: "eggs", name: "Brown Eggs", brand: "Country Farms", size: "12 eggs", price: 118, emoji: "🥚", note: "Brown shell" },
    { id: "eggs-white-6", itemId: "eggs", name: "Farm Fresh White Eggs", brand: "Farm Fresh", size: "6 eggs", price: 54, emoji: "🥚", note: "Smaller pack" },
  ],
  bread: [
    { id: "bread-wheat", itemId: "bread", name: "Whole Wheat Bread", brand: "Bakers Basket", size: "400 g", price: 50, emoji: "🍞", preferred: true, note: "Your usual pick" },
    { id: "bread-multigrain", itemId: "bread", name: "Multigrain Bread", brand: "Bakers Basket", size: "400 g", price: 62, emoji: "🍞", note: "More fibre" },
    { id: "bread-white", itemId: "bread", name: "White Sandwich Bread", brand: "Bakers Basket", size: "400 g", price: 44, emoji: "🍞", note: "Lowest price" },
  ],
};

export function preferredProduct(itemId: string): Product | undefined {
  return CATALOG[itemId]?.find((p) => p.preferred);
}

export function estimatePreferredTotal(itemIds: string[]): number {
  return itemIds.reduce((sum, id) => sum + (preferredProduct(id)?.price ?? 0), 0);
}
