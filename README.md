# StockSync AI

An AI household inventory agent that predicts grocery replenishment needs and prepares an Instamart restock.

> **Status: demo.** This build uses local demo data and a **mock** Instamart adapter. It is **not connected to Swiggy or Instamart**, uses no API keys, and never places an order. Prices, products and delivery times shown are illustrative.

Built as a focused demo for the Swiggy Builders Club application.

## What it shows

**Household inventory → consumption prediction → AI restock recommendation → Instamart-style product search → cart review**

1. StockSync knows the household inventory.
2. It learns consumption cycles from purchase history.
3. It predicts what will run out, and explains why.
4. It builds a prioritised restock plan.
5. It finds products in a mock Instamart search (clearly labelled "Instamart demo").
6. It prepares a cart, and the user reviews and confirms. No order is placed.

## Features

- Dashboard with inventory cards, a prominent milk prediction and a cycle gauge
- Consumption history section: average cycles are computed from the demo purchase history (`lib/predict.ts`), not hard-coded
- Restock plan grouped by priority (HIGH / MEDIUM) with an estimated total
- Mock Instamart search with preferred and alternative products, selectable per item
- Cart, order review and demo success screen, with a progress indicator
- "Ask StockSync" assistant: a rule-based demo that answers from the demo data (no LLM, no API key)
- Loading skeletons and an error state (open `/?demo-error=1` to see the search error once)
- Responsive layout, keyboard focus styles, reduced-motion support

## Architecture

```
app/                  Next.js App Router (layout, page)
components/           UI screens (Dashboard, PlanView, SearchView, CartView, ReviewView, DoneView, ChatWidget)
lib/data.ts           Demo inventory + purchase history
lib/predict.ts        Cycle learning, status, priority, restock plan
lib/catalog.ts        Demo product catalog (illustrative names and prices)
lib/chat.ts           Rule-based demo assistant
lib/types.ts          Shared types
services/instamart.ts Mock Instamart adapter (the integration seam)
```

The UI only talks to `services/instamart.ts` (`searchProducts`, `getProduct`, `createCart`, `addToCart`, `getCart`, `checkout`). Data flows one way: inventory → predictions → plan → product search → cart → review.

## Local setup

Requires Node.js 18.17+.

```bash
npm install
npm run dev
# open http://localhost:3000
```

Production check:

```bash
npm run build && npm start
```

## Vercel deployment

1. Push this folder to a Git repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected **Next.js** framework preset. No environment variables are needed.
4. Deploy.

## Demo flow

1. **Dashboard**: point out the milk prediction, the "Why?" explanation and the confidence level.
2. Scroll to **What StockSync has learned** to show the history behind the cycles.
3. Click **View recommendation** to see the restock plan.
4. Click **Find products on Instamart** and select products (usual picks are pre-selected).
5. Click **Add to cart**, then **Review order**, then **Confirm & Continue**.
6. **Restock ready 🎉** and **Demo complete**.
7. At any point, open **Ask StockSync** and try the suggested questions.

## Current mock integration

`services/instamart.ts` serves local demo data with simulated latency. It does not call Swiggy, and no Swiggy endpoints are assumed. `checkout()` only prepares a cart for review and always reports `orderPlaced: false`.

## Future Swiggy MCP integration

The mock adapter is intended to be replaced with the official Swiggy Instamart MCP integration, if and when access is available. Planned steps:

1. Re-implement the functions in `services/instamart.ts` against the official MCP tools, mapping responses to the `Product` and `Cart` types.
2. Move MCP calls behind a server-side route or server action so credentials stay off the client.
3. Add user authorisation for the household account.
4. Replace `lib/data.ts` with a real backend that records purchases and consumption events.
5. Keep an explicit user confirmation step before any order is placed.
6. Optionally replace `lib/chat.ts` with an LLM that receives the same structured inventory context.
