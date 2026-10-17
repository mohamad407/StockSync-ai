"use client";

import { useEffect, useRef, useState } from "react";
import { answer, SUGGESTED_QUESTIONS } from "@/lib/chat";
import { Spinner } from "./ui";

interface Msg { role: "user" | "ai"; text: string }

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Hi! Ask me about your household's groceries. I answer from your demo inventory and history." },
  ]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, thinking, open]);

  function ask(q: string) {
    const text = q.trim();
    if (!text || thinking) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "ai", text: answer(text) }]);
      setThinking(false);
    }, 650);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[min(520px,75vh)] w-[calc(100vw-2rem)] max-w-sm animate-rise flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-lift" role="dialog" aria-label="StockSync assistant">
          <div className="flex items-center justify-between bg-sync-deep px-4 py-3 text-white">
            <div>
              <p className="font-display font-bold">StockSync assistant</p>
              <p className="text-xs text-white/70">Demo assistant, rule-based. No live AI model.</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close assistant">✕</button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <p className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-sync text-white" : "bg-paper text-ink"}`}>{m.text}</p>
              </div>
            ))}
            {thinking && <p className="flex items-center gap-2 text-sm text-ink-soft"><Spinner /> Thinking...</p>}
            <div ref={end} />
          </div>

          <div className="border-t border-line p-3">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button key={q} onClick={() => ask(q)} disabled={thinking} className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-sync hover:text-sync disabled:opacity-50">
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask(input)}
                placeholder="Ask about your groceries"
                aria-label="Ask a question"
                className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-sync"
              />
              <button onClick={() => ask(input)} disabled={thinking || !input.trim()} className="rounded-xl bg-sync px-4 text-sm font-semibold text-white disabled:opacity-50">Ask</button>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-ink-soft active:scale-95"
        aria-expanded={open}
      >
        <span aria-hidden>🤖</span> {open ? "Close" : "Ask StockSync"}
      </button>
    </div>
  );
}
