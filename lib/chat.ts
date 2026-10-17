import { INVENTORY } from "./data";
import { avgCycleDays, restockPlan, formatINR } from "./predict";
import { estimatePreferredTotal } from "./catalog";

export const SUGGESTED_QUESTIONS = [
  "What should I restock?",
  "What will I run out of this week?",
  "Why do I need milk?",
  "What do I usually buy?",
  "How much might I spend this week?",
];

const list = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/**
 * Rule-based demo assistant. It answers from the demo inventory and history
 * only. There is no LLM behind it. A real version would send the same
 * structured context to a model.
 */
export function answer(question: string): string {
  const q = question.toLowerCase();
  const plan = restockPlan();
  const names = plan.map((i) => i.name.toLowerCase());
  const milk = INVENTORY.find((i) => i.id === "milk")!;

  if (q.includes("why") && q.includes("milk")) {
    return `You usually finish 1 L of milk every ${milk.cycleRange}, and your average cycle is about ${avgCycleDays(milk)} days. Your last purchase was ${milk.lastPurchaseDaysAgo} days ago, so the current litre is likely to run out tomorrow. Confidence is medium because your cycle varies a little.`;
  }
  if (q.includes("restock") || q.includes("should i buy") || q.includes("need")) {
    return `Based on your recent consumption, I recommend ${list(names)}. Milk is the highest priority because your current consumption pattern suggests it may run out tomorrow.`;
  }
  if (q.includes("spend") || q.includes("cost") || q.includes("much") || q.includes("budget")) {
    const total = estimatePreferredTotal(plan.map((i) => i.id));
    return `Restocking ${list(names)} would cost about ${formatINR(total)} at your usual picks (demo prices). Milk and bread run on short cycles, so you may need a small top-up later in the week.`;
  }
  if (q.includes("week") || q.includes("run out")) {
    const soon = INVENTORY.filter((i) => i.daysLeft <= 7).sort((a, b) => a.daysLeft - b.daysLeft);
    return `This week you may run out of ${list(soon.map((i) => `${i.name.toLowerCase()} (~${i.daysLeft} day${i.daysLeft === 1 ? "" : "s"})`))}. Rice and detergent look healthy for now.`;
  }
  if (q.includes("usually buy") || q.includes("what do i buy") || q.includes("regular")) {
    const rows = INVENTORY.map((i) => `${i.name.toLowerCase()} every ~${avgCycleDays(i)} days`);
    return `From your history: ${list(rows)}.`;
  }
  return `I'm a demo assistant and only understand a few questions about this household's inventory. Try "What should I restock?" or "Why do I need milk?".`;
}
