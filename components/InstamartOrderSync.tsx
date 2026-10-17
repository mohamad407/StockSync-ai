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
type ConnectionStatus = { connected?: boolean; error?: string; message?: string };

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
      const user = firebaseAuth.currentUser;
      if (!user) {
        setConnected(false);
        setError("Sign in to StockSync AI before checking your Swiggy connection.");
        return;
      }
      const token = await user.getIdToken();
      const response = await fetch("/api/instamart/status", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as ConnectionStatus;
      if (!response.ok) throw new Error(payload.error ?? "Unable to check Swiggy connection.");
      setConnected(payload.connected === true);
      setError(null);
    } catch (err) {
      setConnected(null);
      setError(err instanceof Error ? err.message : "Unable to check Swiggy connection.");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);

  async function connectSwiggy() {
    setError(null);
    setSummary(null);
    setConnecting(true);
    try {
      const user = firebaseAuth.currentUser;
      if (!user) throw new Error("Sign in to StockSync AI before connecting Swiggy.");
      const token = await user.getIdToken();
      const response = await fetch("/api/instamart/auth/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as { authorizationUrl?: string; error?: string };
      if (!response.ok || !payload.authorizationUrl) {
        throw new Error(payload.error ?? "Unable to start Swiggy authorization.");
      }
      window.location.assign(payload.authorizationUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Swiggy authorization.");
      setConnecting(false);
    }
  }

  async function syncOrders() {
    setSyncing(true);
    setError(null);
    setSummary(null);
    try {
      const user = firebaseAuth.currentUser;
      if (!user) throw new Error("Sign in to StockSync AI before syncing orders.");
      const token = await user.getIdToken();
      const response = await fetch("/api/instamart/orders", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as SyncSummary;
      if (!response.ok) throw new Error(payload.error ?? "Unable to sync Instamart order history.");
      setSummary(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sync Instamart order history.");
    } finally {
      setSyncing(false);
    }
  }

  const resultMessage = summary
    ? summary.fetchedOrders === 0
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
        <h2 id="instamart-sync-title" className="font-display text-xl font-bold">
          Automatic Instamart order sync
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Connect your own Swiggy account to import supported Instamart order history. Mobile verification takes place on Swiggy's authorization page.
        </p>

        <div className="mt-4 rounded-xl border border-line p-3">
          <p className="text-sm font-semibold">Connection status</p>
          <p className="mt-1 text-sm text-ink-soft">
            {checking ? "Checking connection..." : connected === true ? "Swiggy is connected to your StockSync account." : connected === false ? "Swiggy is not connected." : "Connection status is currently unavailable."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void connectSwiggy()} disabled={connecting}>
              {connecting ? "Opening Swiggy..." : connected ? "Reconnect Swiggy" : "Connect Swiggy with Mobile Number"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void refreshStatus()} disabled={checking}>
              Refresh connection
            </Button>
          </div>
        </div>

        {connected === true && (
          <>
            <p className="mt-4 text-sm text-ink-soft">
              Sync the recent orders your Swiggy account is authorized to access. Repeated syncs skip duplicate order lines.
            </p>
            <Button className="mt-3" type="button" onClick={() => void syncOrders()} disabled={syncing}>
              {syncing ? "Syncing orders..." : "Sync Instamart orders"}
            </Button>
          </>
        )}

        {error && <div role="alert" className="mt-4 rounded-xl border border-alert/30 bg-alert-soft p-3 text-sm text-alert">{error}</div>}

        {summary && (
          <div role="status" className="mt-4 rounded-xl bg-sync-soft p-4 text-sm text-sync-deep">
            <p className="font-semibold">{resultMessage}</p>
            <dl className="mt-3 space-y-1">
              <div className="flex justify-between gap-3"><dt>Orders returned</dt><dd className="font-semibold">{summary.fetchedOrders ?? 0}</dd></div>
              <div className="flex justify-between gap-3"><dt>Completed orders</dt><dd className="font-semibold">{summary.completedOrders ?? 0}</dd></div>
              <div className="flex justify-between gap-3"><dt>New purchase events</dt><dd className="font-semibold">{summary.importedEvents ?? 0}</dd></div>
              <div className="flex justify-between gap-3"><dt>Duplicates skipped</dt><dd className="font-semibold">{summary.duplicateEvents ?? 0}</dd></div>
            </dl>
            {summary.note && <p className="mt-3 text-xs">{summary.note}</p>}
          </div>
        )}

        <p className="mt-4 text-xs text-ink-soft">
          Swiggy tokens are encrypted at rest and associated with the signed-in StockSync account. Imported historical orders do not automatically change current inventory.
        </p>
      </Card>
    </section>
  );
}
