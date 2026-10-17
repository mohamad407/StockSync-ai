import { restockPlan, priorityOf, runOutPhrase, formatINR } from "@/lib/predict";
import { estimatePreferredTotal } from "@/lib/catalog";
import { Button, Card } from "./ui";

export default function PlanView({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const plan = restockPlan();
  const total = estimatePreferredTotal(plan.map((i) => i.id));
  const groups = [
    { key: "high", label: "HIGH", cls: "bg-alert-soft text-alert" },
    { key: "medium", label: "MEDIUM", cls: "bg-amber2-soft text-amber2" },
  ] as const;

  return (
    <div className="animate-rise pb-24">
      <button onClick={onBack} className="mt-8 text-sm font-semibold text-ink-soft hover:text-ink">← Back to dashboard</button>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Your AI Restock Plan</h1>
      <p className="mt-2 text-ink-soft">Ordered by how soon each item is likely to run out.</p>

      <div className="mt-6 space-y-6">
        {groups.map((g) => {
          const items = plan.filter((i) => priorityOf(i) === g.key);
          if (!items.length) return null;
          return (
            <section key={g.key} aria-label={`${g.label} priority`}>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold tracking-wide ${g.cls}`}>{g.label}</span>
              <div className="mt-3 space-y-3">
                {items.map((i) => (
                  <Card key={i.id} className="flex items-center gap-4 p-4">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-paper text-2xl" aria-hidden>{i.emoji}</span>
                    <div>
                      <h3 className="font-display text-lg font-bold">{i.name}</h3>
                      <p className="text-sm text-ink-soft">{runOutPhrase(i.daysLeft)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Card className="mt-8 flex flex-wrap items-center justify-between gap-4 bg-sync-soft p-5">
        <div>
          <p className="font-display text-lg font-bold">StockSync recommends restocking {plan.length} items.</p>
          <p className="mt-1 text-sm text-ink-soft">Estimated total (demo prices, your usual picks)</p>
          <p className="font-display text-3xl font-bold text-sync-deep">{formatINR(total)}</p>
        </div>
        <Button onClick={onNext}>Find products on Instamart</Button>
      </Card>
    </div>
  );
}
