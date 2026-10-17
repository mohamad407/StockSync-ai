export default function Header({ onHome }: { onHome: () => void }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <button onClick={onHome} className="group flex items-center gap-3 text-left" aria-label="StockSync AI home">
        <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-sync text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 11a8 8 0 0 0-14.5-4.6L4 8" />
            <path d="M4 4v4h4" />
            <path d="M4 13a8 8 0 0 0 14.5 4.6L20 16" />
            <path d="M20 20v-4h-4" />
          </svg>
        </span>
        <span>
          <span className="block font-display text-lg font-bold leading-tight">StockSync AI</span>
          <span className="block text-xs text-ink-soft">Your household, always in sync.</span>
        </span>
      </button>
      <div className="flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-3.5 shadow-card">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-sync-soft text-sm" aria-hidden>🏠</span>
        <span className="text-sm font-semibold leading-none">
          Home
          <span className="ml-1.5 text-xs font-medium text-ink-mute">3 members</span>
        </span>
      </div>
    </header>
  );
}
