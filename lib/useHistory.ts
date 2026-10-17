"use client";

import { useCallback, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

export type GroceryEventType = "purchased" | "consumed";

export interface GroceryEvent {
  id: string;
  ownerUid: string;
  itemName: string;
  eventType: GroceryEventType;
  quantity: string;
  unit: string;
  eventDate: string;
  unitPrice: string | null;
  notes: string | null;
  source?: string;
  externalOrderId?: string | null;
  externalItemKey?: string | null;
  createdAt: string;
  updatedAt: string;
  inventoryReconciled?: boolean;
  inventoryAdjusted?: boolean;
  stockShortfall?: boolean;
}

export interface CreateGroceryEvent {
  itemName: string;
  eventType: GroceryEventType;
  quantity: number;
  unit: string;
  eventDate?: string;
  unitPrice?: number | null;
  notes?: string | null;
  applyToInventory?: boolean;
}

type HistoryPayload = {
  events?: GroceryEvent[];
  event?: GroceryEvent;
  error?: string;
};

async function historyRequest(
  method: "GET" | "POST",
  body?: CreateGroceryEvent,
): Promise<HistoryPayload> {
  const user = firebaseAuth.currentUser;

  if (!user) {
    throw new Error("Please sign in to manage grocery history.");
  }

  const token = await user.getIdToken();

  const response = await fetch("/api/history", {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as HistoryPayload;

  if (!response.ok) {
    throw new Error(payload.error ?? "The grocery history request failed.");
  }

  return payload;
}

export function useHistory() {
  const [events, setEvents] = useState<GroceryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await historyRequest("GET");
      setEvents(payload.events ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load grocery history.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      if (user) {
        void refresh();
      } else {
        setEvents([]);
        setLoading(false);
        setError(null);
      }
    });

    return unsubscribe;
  }, [refresh]);

  const recordEvent = useCallback(async (input: CreateGroceryEvent) => {
    setSaving(true);
    setError(null);

    try {
      const payload = await historyRequest("POST", input);

      if (!payload.event) {
        throw new Error("The server did not return the saved grocery event.");
      }

      setEvents((current) =>
        [payload.event!, ...current]
          .sort(
            (a, b) =>
              new Date(b.eventDate).getTime() -
              new Date(a.eventDate).getTime(),
          )
          .slice(0, 500),
      );

      return payload.event;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save grocery history.";

      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    events,
    loading,
    saving,
    error,
    refresh,
    recordEvent,
  };
}


