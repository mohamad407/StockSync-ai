"use client";

import { useEffect, useRef, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";
import { Spinner } from "./ui";

interface Msg {
  role: "user" | "ai";
  text: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: "Hi! I'm your StockSync AI assistant, powered by Gemini. Ask me about grocery planning, restocking, budgeting, or food waste.",
    },
  ]);

  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, thinking, open]);

  async function ask(question: string) {
    const text = question.trim();

    if (!text || thinking) return;

    if (text.length > 1000) {
      setMsgs((previous) => [
        ...previous,
        { role: "ai", text: "Please keep your question under 1000 characters." },
      ]);
      return;
    }

    setMsgs((previous) => [...previous, { role: "user", text }]);
    setInput("");
    setThinking(true);

    try {
      const user = firebaseAuth.currentUser;

      if (!user) {
        throw new Error("Please sign in before using the assistant.");
      }

      const token = await user.getIdToken();

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: text }),
        cache: "no-store",
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "The assistant could not answer. Please try again.";

        throw new Error(message);
      }

      const answer =
        typeof payload === "object" &&
        payload !== null &&
        "answer" in payload &&
        typeof payload.answer === "string"
          ? payload.answer
          : null;

      if (!answer) {
        throw new Error("The AI returned an invalid response.");
      }

      setMsgs((previous) => [...previous, { role: "ai", text: answer }]);
    } catch (error) {
      setMsgs((previous) => [
        ...previous,
        {
          role: "ai",
          text:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="flex h-[min(560px,75vh)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-lift"
          role="dialog"
          aria-label="StockSync AI assistant"
        >
          <div className="flex items-center justify-between bg-sync-deep px-4 py-3 text-white">
            <div>
              <p className="font-display font-bold">StockSync AI</p>
              <p className="text-xs text-white/70">Powered by Gemini</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-2 hover:bg-white/10"
              aria-label="Close assistant"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <p
                  className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-sync text-white"
                      : "bg-paper text-ink"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ))}

            {thinking && (
              <p className="flex items-center gap-2 text-sm text-ink-soft" role="status">
                <Spinner />
                Gemini is thinking...
              </p>
            )}

            <div ref={end} />
          </div>

          <div className="border-t border-line p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {[
                "What should I restock?",
                "How can I reduce food waste?",
                "Help me plan my grocery budget.",
              ].map((question) => (
                <button
                  key={question}
                  onClick={() => void ask(question)}
                  disabled={thinking}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-sync disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void ask(input);
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={1000}
                placeholder="Ask your grocery assistant..."
                aria-label="Ask StockSync AI"
                className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-sync"
              />

              <button
                type="submit"
                disabled={thinking || !input.trim()}
                className="rounded-xl bg-sync px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Ask
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-white shadow-lift hover:bg-ink-soft"
        aria-expanded={open}
      >
        <span aria-hidden="true">🤖</span>
        {open ? "Close" : "Ask StockSync AI"}
      </button>
    </div>
  );
}
