export type Screen = "dashboard" | "plan" | "search" | "cart" | "review" | "done";

const STEPS = ["Predict", "Plan", "Find", "Cart", "Review"];
const INDEX: Record<Screen, number> = { dashboard: 0, plan: 1, search: 2, cart: 3, review: 4, done: 5 };

export default function Stepper({ screen }: { screen: Screen }) {
  const current = INDEX[screen];
  return (
    <nav aria-label="Demo progress" className="mt-6">
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex flex-1 flex-col gap-1.5" aria-current={active ? "step" : undefined}>
              <span
                className={`h-1.5 rounded-full transition-colors duration-500 ${
                  done ? "bg-sync" : active ? "bg-sync/50" : "bg-line"
                }`}
              />
              <span className={`text-xs font-semibold ${active ? "text-ink" : done ? "text-sync" : "text-ink-mute"}`}>
                {done ? "✓ " : ""}
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
