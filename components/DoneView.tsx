import type { Cart } from "@/lib/types";
import { formatINR } from "@/lib/predict";
import { Button, Card } from "./ui";

export default function DoneView({ cart, onRestart }: { cart: Cart; onRestart: () => void }) {
  return (
    <div className="animate-rise pb-24 text-center">
      <div className="mx-auto mt-14 grid h-20 w-20 animate-pop place-items-center rounded-full bg-sync text-4xl text-white shadow-lift" aria-hidden>✓</div>
      <h1 className="mt-6 font-display text-4xl font-bold tracking-tight">Restock ready 🎉</h1>
      <p className="mt-2 text-lg text-ink-soft">Your Instamart cart has been prepared for review.</p>

      <Card className="mx-auto mt-8 max-w-md p-5 text-left">
        <ul className="space-y-1.5 text-[15px]">
          {cart.lines.map((l) => (
            <li key={l.product.id} className="flex justify-between"><span>{l.product.emoji} {l.product.name}</span><span className="font-semibold">{formatINR(l.product.price * l.qty)}</span></li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-line pt-3 font-semibold"><span>Estimated total</span><span className="text-sync-deep">{formatINR(cart.total)}</span></p>
      </Card>

      <p className="mt-6 inline-block rounded-full border border-sync/30 bg-sync-soft px-4 py-1.5 text-sm font-semibold text-sync-deep">Demo complete</p>
      <div className="mt-6"><Button variant="ghost" onClick={onRestart}>Start the demo again</Button></div>
    </div>
  );
}
