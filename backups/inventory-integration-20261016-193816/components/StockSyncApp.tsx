"use client";

import { useEffect, useState } from "react";
import type { Cart } from "@/lib/types";
import { simulateFailureOnce } from "@/services/instamart";
import Header from "./Header";
import Stepper, { type Screen } from "./Stepper";
import Dashboard from "./Dashboard";
import PlanView from "./PlanView";
import SearchView from "./SearchView";
import CartView from "./CartView";
import ReviewView from "./ReviewView";
import DoneView from "./DoneView";
import ChatWidget from "./ChatWidget";

export default function StockSyncApp() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [cart, setCart] = useState<Cart | null>(null);

  // Optional: open the site with ?demo-error=1 to show the search error state once.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("demo-error")) simulateFailureOnce();
  }, []);

  const go = (s: Screen) => {
    setScreen(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-5 sm:px-6">
      <Header onHome={() => go("dashboard")} />
      <Stepper screen={screen} />

      {screen === "dashboard" && <Dashboard onView={() => go("plan")} />}
      {screen === "plan" && <PlanView onBack={() => go("dashboard")} onNext={() => go("search")} />}
      {screen === "search" && (
        <SearchView
          onBack={() => go("plan")}
          onCart={(c) => {
            setCart(c);
            go("cart");
          }}
        />
      )}
      {screen === "cart" && cart && <CartView cart={cart} onBack={() => go("search")} onNext={() => go("review")} />}
      {screen === "review" && cart && <ReviewView cart={cart} onBack={() => go("cart")} onDone={() => go("done")} />}
      {screen === "done" && cart && (
        <DoneView
          cart={cart}
          onRestart={() => {
            setCart(null);
            go("dashboard");
          }}
        />
      )}

      <ChatWidget />
    </div>
  );
}
