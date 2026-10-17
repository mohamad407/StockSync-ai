import { firebaseAuth } from "@/lib/firebase/client";
import type { Cart, Product } from "@/lib/types";

type JsonRecord = Record<string, unknown>;

const carts = new Map<string, Cart>();
let failNext = false;
export function simulateFailureOnce() { failNext = true; }

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = asText(value).trim();
    if (text) return text;
  }
  return "";
}

function collectProductGroups(value: unknown, output: JsonRecord[], depth = 0): void {
  if (depth > 12 || value == null) return;

  if (Array.isArray(value)) {
    for (const item of value) collectProductGroups(item, output, depth + 1);
    return;
  }

  if (!isRecord(value)) {
    if (typeof value === "string" && depth < 8) {
      const trimmed = value.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          collectProductGroups(JSON.parse(trimmed), output, depth + 1);
        } catch {
          // Ignore text blocks that are not JSON.
        }
      }
    }
    return;
  }

  // MCP tool responses can wrap the actual payload in text content blocks.
  for (const key of ["structuredContent", "data", "result", "content", "products", "items"]) {
    if (key in value) {
      const child = value[key];

      if (
        key === "products" &&
        Array.isArray(child)
      ) {
        for (const product of child) {
          if (isRecord(product)) output.push(product);
          else collectProductGroups(product, output, depth + 1);
        }
      } else {
        collectProductGroups(child, output, depth + 1);
      }
    }
  }

  // Some Swiggy responses contain a products array under a nested search object.
  if (
    ("displayName" in value || "name" in value) &&
    ("variations" in value || "price" in value || "productId" in value)
  ) {
    output.push(value);
  }
}

function parseProducts(payload: unknown, query: string): Product[] {
  const groups: JsonRecord[] = [];
  collectProductGroups(payload, groups);

  const products: Product[] = [];
  const seen = new Set<string>();
  const normalizedQuery = query.toLowerCase();

  for (const group of groups) {
    const variations = Array.isArray(group.variations)
      ? group.variations.filter(isRecord)
      : [];

    // Each variation is a distinct purchasable size/price.
    const choices: (JsonRecord | null)[] = variations.length
      ? variations.map((variation) => variation)
      : [null];

    for (const variation of choices) {
      const item = variation ?? group;
      const name = firstText(item.displayName, group.displayName, item.name, group.name);
      if (!name) continue;

      // Keep results relevant to the requested query, allowing common plurals.
      const terms = normalizedQuery.split(/\s+/).filter(Boolean);
      const searchable = `${name} ${firstText(item.brandName, group.brand, group.brandName)}`.toLowerCase();
      if (terms.length && !terms.every((term) =>
        searchable.includes(term) ||
        (term.endsWith("s") && searchable.includes(term.slice(0, -1)))
      )) {
        continue;
      }

      const priceObject = isRecord(item.price) ? item.price : {};
      const price = asNumber(priceObject.offerPrice, asNumber(priceObject.mrp, 0));
      if (price < 0) continue;

      const skuId = firstText(item.skuId);
      const spinId = firstText(item.spinId);
      const productId = firstText(group.productId, group.parentProductId, name);
      const id = skuId || spinId || `${productId}-${firstText(item.quantityDescription)}`;

      if (seen.has(id)) continue;
      seen.add(id);

      const stockValue = item.isInStockAndAvailable ?? group.inStock ?? group.isAvail;
      const inStock = stockValue === undefined ? true : stockValue === true;

      const rating = isRecord(item.rating) ? item.rating : {};
      const sla = isRecord(item.sla) ? item.sla : {};

      products.push({
        id,
        itemId: query,
        name,
        brand: firstText(item.brandName, group.brandName, group.brand, "Brand not listed"),
        size: firstText(item.quantityDescription, "Size not listed"),
        price,
        emoji: "🛒",
        preferred: products.length === 0,
        note: inStock ? "Live Instamart result" : "Currently unavailable",
        imageUrl: firstText(item.imageUrl, group.imageUrl) || undefined,
        mrp: asNumber(priceObject.mrp, price) || price,
        inStock,
        maxQuantity: asNumber(item.maxQuantity, 0) || undefined,
        rating: asText(rating.value) || undefined,
        ratingCount: asText(rating.count) || undefined,
        deliveryTime: [asText(sla.value), asText(sla.unit)].filter(Boolean).join(" ") || undefined,
        spinId: spinId || undefined,
        skuId: skuId || undefined,
      });
    }
  }

  return products.filter((product) => product.inStock);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const user = firebaseAuth.currentUser;

  if (!user) {
    throw new Error("Sign in to StockSync AI before searching Instamart.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `/api/instamart?q=${encodeURIComponent(query)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "Instamart product search failed.";
    throw new Error(message);
  }

  const products = parseProducts(payload, query);
  for (const product of products) currentProducts.set(product.id, product);

  if (!products.length) {
    throw new Error(
      `No available matching products were found for "${query}". Try a more general search.`,
    );
  }

  return products;
}

export async function getProduct(productId: string): Promise<Product> {
  for (const cart of carts.values()) {
    const product = cart.lines.find((line) => line.product.id === productId)?.product;
    if (product) return product;
  }

  throw new Error("Product not found in the local cart.");
}

export async function createCart(): Promise<Cart> {
  const cart: Cart = {
    id: `local-cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    lines: [],
    total: 0,
  };

  carts.set(cart.id, cart);
  return structuredClone(cart);
}

export async function addToCart(
  cartId: string,
  productId: string,
  qty = 1,
): Promise<Cart> {
  const cart = carts.get(cartId);
  if (!cart) throw new Error("Local cart not found. Please start again.");

  // Product details are supplied by live search. This is only a local preview.
  const product = currentProducts.get(productId);
  if (!product) throw new Error("Product details expired. Search again.");

  const existing = cart.lines.find((line) => line.product.id === productId);
  if (existing) existing.qty += qty;
  else cart.lines.push({ product, qty });

  cart.total = cart.lines.reduce(
    (sum, line) => sum + line.product.price * line.qty,
    0,
  );

  return structuredClone(cart);
}

const currentProducts = new Map<string, Product>();



export async function getCart(cartId: string): Promise<Cart> {
  const cart = carts.get(cartId);
  if (!cart) throw new Error("Local cart not found.");
  return structuredClone(cart);
}

export interface CheckoutResult {
  status: "prepared";
  cart: Cart;
  etaMinutes: [number, number];
  orderPlaced: false;
}

export async function checkout(cartId: string): Promise<CheckoutResult> {
  const cart = await getCart(cartId);
  return { status: "prepared", cart, etaMinutes: [10, 15], orderPlaced: false };
}



