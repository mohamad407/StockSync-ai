"use client";

import { Card, Button } from "./ui";
import GroceryHistory from "./GroceryHistory";
import InventoryManager from "./InventoryManager";
import InstamartOrderSync from "./InstamartOrderSync";
import RestockRecommendations from "./RestockRecommendations";

export default function Dashboard({ onView }: { onView: () => void }) {
  return (
    <div className="animate-rise">
      <header className="mt-8">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Your household dashboard
        </h1>
        <p className="mt-2 text-lg text-ink-soft">
          Manage your saved groceries and keep your purchase history in sync.
        </p>
      </header>

      <InventoryManager />

      <InstamartOrderSync />

      <GroceryHistory />

      <RestockRecommendations />

      <section className="mt-8">
        <Card className="p-5">
          <h2 className="font-display text-xl font-bold">Shopping</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Browse grocery products separately from your household inventory
            and restock estimates.
          </p>
          <Button className="mt-4" onClick={onView}>
            Open shopping view
          </Button>
        </Card>
      </section>
    </div>
  );
}
