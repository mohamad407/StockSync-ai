/**
 * Instamart service adapter (MOCK).
 *
 * This mock adapter is intended to be replaced with the official Swiggy
 * Instamart MCP integration. Nothing in this file talks to Swiggy: it serves
 * local demo data with simulated latency so the UI can be built and reviewed
 * without credentials.
 *
 * The rest of the app depends only on the function signatures below. When the
 * real MCP integration is available, re-implement these functions against it
 * (mapping its responses to the Product / Cart types in lib/types.ts) and the
 * UI should not need to change. No Swiggy endpoints are assumed here.
 */
import { CATALOG } from "@/lib/catalog";
import type { Cart, Product } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const carts = new Map<string, Cart>();
let failNext = false;

/** Demo helper: makes the next search fail once so the error state can be shown. */
export function simulateFailureOnce() {
  failNext = true;
}

/** Find products for a household item (e.g. "milk"). */
export async function searchProducts(query: string): Promise<Product[]> {
  await sleep(700);
  if (failNext) {
    failNext = false;
    throw new Error("Instamart demo could not load products. Check your connection and try again.");
  }
  const results = CATALOG[query.toLowerCase()];
  if (!results) throw new Error(`No demo products for "${query}".`);
  return results;
}

export async function getProduct(productId: string): Promise<Product> {
  await sleep(150);
  for (const list of Object.values(CATALOG)) {
    const hit = list.find((p) => p.id === productId);
    if (hit) return hit;
  }
  throw new Error("Product not found in demo catalog.");
}

export async function createCart(): Promise<Cart> {
  await sleep(200);
  const cart: Cart = { id: `demo-cart-${Date.now()}`, lines: [], total: 0 };
  carts.set(cart.id, cart);
  return structuredClone(cart);
}

export async function addToCart(cartId: string, productId: string, qty = 1): Promise<Cart> {
  await sleep(150);
  const cart = carts.get(cartId);
  if (!cart) throw new Error("Cart not found.");
  const product = await getProduct(productId);
  const existing = cart.lines.find((l) => l.product.id === productId);
  if (existing) existing.qty += qty;
  else cart.lines.push({ product, qty });
  cart.total = cart.lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  return structuredClone(cart);
}

export async function getCart(cartId: string): Promise<Cart> {
  await sleep(100);
  const cart = carts.get(cartId);
  if (!cart) throw new Error("Cart not found.");
  return structuredClone(cart);
}

export interface CheckoutResult {
  status: "prepared";
  cart: Cart;
  etaMinutes: [number, number];
  /** Always false in this demo. No order is ever placed. */
  orderPlaced: false;
}

/**
 * Demo checkout: prepares the cart for review only. It never places an order.
 * A real integration must keep an explicit user confirmation step before any order.
 */
export async function checkout(cartId: string): Promise<CheckoutResult> {
  await sleep(900);
  const cart = await getCart(cartId);
  return { status: "prepared", cart, etaMinutes: [10, 15], orderPlaced: false };
}
