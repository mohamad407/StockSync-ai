"use client";

import { useCallback, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

export interface SavedInventoryItem {
  id: string;
  ownerUid: string;
  householdId: string | null;
  name: string;
  category: string | null;
  quantity: string;
  unit: string;
  lowStockThreshold: string;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

type InventoryPayload = {
  items?: SavedInventoryItem[];
  item?: SavedInventoryItem;
  error?: string;
};

async function inventoryRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
  id?: string,
): Promise<InventoryPayload> {
  const user = firebaseAuth.currentUser;

  if (!user) {
    throw new Error("Please sign in to manage your inventory.");
  }

  const token = await user.getIdToken();

  const url = id
    ? `/api/inventory?id=${encodeURIComponent(id)}`
    : "/api/inventory";

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = (await response.json().catch(() => ({}))) as InventoryPayload;

  if (!response.ok) {
    throw new Error(payload.error ?? "The inventory request failed.");
  }

  return payload;
}

export function useInventory() {
  const [items, setItems] = useState<SavedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await inventoryRequest("GET");
      setItems(payload.items ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load inventory.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (firebaseAuth.currentUser) {
      void refresh();
    }

    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      if (user) {
        void refresh();
      } else {
        setItems([]);
        setLoading(false);
        setError(null);
      }
    });

    return unsubscribe;
  }, [refresh]);

  const addItem = useCallback(
    async (input: {
      name: string;
      category?: string | null;
      quantity: number;
      unit: string;
      lowStockThreshold?: number;
      expiryDate?: string | null;
      notes?: string | null;
    }) => {
      const payload = await inventoryRequest("POST", input);
      if (!payload.item) throw new Error("The server did not return the new item.");
      setItems((current) => [payload.item!, ...current]);
      return payload.item;
    },
    [],
  );

  const updateItem = useCallback(
    async (
      id: string,
      changes: Partial<{
        name: string;
        category: string | null;
        quantity: number;
        unit: string;
        lowStockThreshold: number;
        expiryDate: string | null;
        notes: string | null;
      }>,
    ) => {
      const payload = await inventoryRequest("PATCH", changes, id);
      if (!payload.item) throw new Error("The server did not return the updated item.");
      setItems((current) =>
        current.map((item) => item.id === id ? payload.item! : item),
      );
      return payload.item;
    },
    [],
  );

  const deleteItem = useCallback(async (id: string) => {
    await inventoryRequest("DELETE", undefined, id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    loading,
    error,
    refresh,
    addItem,
    updateItem,
    deleteItem,
  };
}