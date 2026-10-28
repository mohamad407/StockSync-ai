"use client";

import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";
import { Button, Spinner } from "./ui";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; to: string }
  | { kind: "nothing" }
  | { kind: "error"; message: string };

export default function LowStockEmailButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function sendSummary() {
    const user = firebaseAuth.currentUser;

    if (!user) {
      setStatus({
        kind: "error",
        message: "Please sign in again to send the email.",
      });
      return;
    }

    setStatus({ kind: "sending" });

    try {
      const token = await user.getIdToken();

      const response = await fetch("/api/notifications/low-stock", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        sent?: boolean;
        to?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The email could not be sent.");
      }

      if (!payload.sent) {
        setStatus({ kind: "nothing" });
        return;
      }

      setStatus({ kind: "sent", to: payload.to ?? user.email ?? "your inbox" });
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error ? err.message : "The email could not be sent.",
      });
    }
  }

  const sending = status.kind === "sending";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Button
        type="button"
        variant="ghost"
        onClick={sendSummary}
        disabled={disabled || sending}
        className="w-full rounded-xl py-2.5 text-sm sm:w-auto"
      >
        {sending ? <Spinner /> : <span aria-hidden="true">✉</span>}
        {sending ? "Sending…" : "Email me this summary"}
      </Button>

      <div role="status" aria-live="polite" className="min-h-5 text-xs sm:ml-2">
        {status.kind === "sent" && (
          <span className="font-medium text-sync-deep">
            Sent to {status.to}
          </span>
        )}
        {status.kind === "nothing" && (
          <span className="text-ink-soft">
            Nothing is running low, so no email was sent.
          </span>
        )}
        {status.kind === "error" && (
          <span className="font-medium text-alert">{status.message}</span>
        )}
      </div>
    </div>
  );
}
