import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "StockSync AI - Your household, always in sync",
  description:
    "An AI household inventory agent that predicts grocery replenishment needs and prepares an Instamart restock. Demo with mock data.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F5F8FA" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
