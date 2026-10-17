"use client";

import { useCallback, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";
import { Button, Card } from "./ui";

type SyncSummary = {
  ok?: boolean;
  mode?: string;
  fetchedOrders?: number;
  completedOrders?: number;
  importedOrders?: number;
  importedEvents?: number;
  duplicateEvents?: number;
  skippedItems?: number;
  note?: string;
  error?: string;
};

type ConnectionStatus = {
  connected?: boolean;
  error?: string;
};

export default function InstamartOrderSync() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  const refreshStatus = useCallback(async () => {
    setChecking(true);

    try {
      const response = await fetch("/api/instamart/status", {
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => ({}))) as ConnectionStatus;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to check Swiggy connection.");
      }

      setConnected(payload.connected === true);
    } catch (err) {
      setConnected(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to check Swiggy connection.",
      );
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      void refreshStatus();
    }
  }, [refreshStatus]);

  // This integration currently uses a process-local token store and is
  // intentionally not presented as production-ready.
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  function connectSwiggy() {
    setError(null);
    setSummary(null);
    setConnecting(true);

    // Swiggy's own authorization page handles mobile number and OTP.
    window.location.assign("/api/instamart/auth/start");
  }

  async function syncOrders() {
    setSyncing(true);
    setError(null);
    setSummary(null);

    try {
      const user = firebaseAuth.currentUser;

      if (!user) {
        throw new Error("Sign in to StockSync AI before syncing orders.");
      }

      const token = await user.getIdToken();

      const response = await fetch("/api/instamart/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => ({}))) as SyncSummary;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Unable to sync Instamart order history.",
        );
      }

      setSummary(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sync Instamart order history.",
      );
    } finally {
      setSyncing(false);
    }
  }

  const resultMessage = summary
    ? summary.mode === "development-stub"
      ? "Local development fixture used. This is not a real Swiggy order."
      : summary.fetchedOrders === 0
        ? "Swiggy returned no recent orders. No purchase events were invented."
        : summary.completedOrders === 0
          ? "No eligible completed orders were found in the returned order list."
          : summary.importedEvents === 0 && (summary.duplicateEvents ?? 0) > 0
            ? "No new events were added because the returned order items were already imported."
            : summary.importedEvents === 0
              ? "No eligible order items were imported. Review the returned order data and integration access."
              : "Eligible order items were saved to grocery history."
    : null;

  return (
    <section className="mt-8" aria-labelledby="instamart-sync-title">
      <Card className="p-5">
        <h2
          id="instamart-sync-title"
          className="font-display text-xl font-bold"
        >
          Automatic Instamart order sync
        </h2>

        <p className="mt-2 text-sm text-ink-soft">
          Connect your Swiggy account to import supported Instamart order
          history. Mobile verification takes place on Swiggy's authorization
          page, not inside StockSync AI.
        </p>

        <div className="mt-4 rounded-xl border border-line p-3">
          <p className="text-sm font-semibold">
            Connection status
          </p>

          <p className="mt-1 text-sm text-ink-soft">
            {checking
              ? "Checking connection..."
              : connected === true
                ? "Swiggy is connected in this local development session."
                : connected === false
                  ? "Swiggy is not connected."
                  : "Connection status is currently unavailable."}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={connectSwiggy}
              disabled={connecting}
            >
              {connecting
                ? "Opening Swiggy..."
                : connected
                  ? "Reconnect Swiggy"
                  : "Connect Swiggy with Mobile Number"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => void refreshStatus()}
              disabled={checking}
            >
              Refresh connection
            </Button>
          </div>
        </div>

        {connected === true && (
          <>
            <p className="mt-4 text-sm text-ink-soft">
              After connecting, sync the recent orders your account is
              authorized to access. Repeated syncs should skip duplicate
              imported order lines.
            </p>

            <Button
              className="mt-3"
              type="button"
              onClick={() => void syncOrders()}
              disabled={syncing}
            >
              {syncing ? "Syncing orders..." : "Sync Instamart orders"}
            </Button>
          </>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-alert/30 bg-alert-soft p-3 text-sm text-alert"
          >
            {error}
          </div>
        )}

        {summary && (
          <div
            role="status"
            className="mt-4 rounded-xl bg-sync-soft p-4 text-sm text-sync-deep"
          >
            <p className="font-semibold">{resultMessage}</p>

            <dl className="mt-3 space-y-1">
              <div className="flex justify-between gap-3">
                <dt>Orders returned</dt>
                <dd className="font-semibold">
                  {summary.fetchedOrders ?? 0}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt>Completed orders</dt>
                <dd className="font-semibold">
                  {summary.completedOrders ?? 0}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt>New purchase events</dt>
                <dd className="font-semibold">
                  {summary.importedEvents ?? 0}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt>Duplicates skipped</dt>
                <dd className="font-semibold">
                  {summary.duplicateEvents ?? 0}
                </dd>
              </div>
            </dl>

            {summary.note && (
              <p className="mt-3 text-xs">{summary.note}</p>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-ink-soft">
          This local prototype uses temporary server-side token storage.
          Do not treat it as production-ready or share access tokens. Imported
          historical orders do not automatically modify current inventory.
        </p>
      </Card>
    </section>
  );
}
