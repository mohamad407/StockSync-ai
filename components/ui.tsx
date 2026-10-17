import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "light" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[15px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
  const styles = {
    primary: "bg-sync text-white shadow-lift hover:bg-sync-deep",
    ghost: "border border-line bg-white text-ink hover:bg-paper",
    light: "bg-white text-sync-deep hover:bg-sync-soft",
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function DemoBadge({ children = "Instamart demo" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber2-soft px-3 py-1 text-xs font-semibold text-amber2">
      <span className="h-1.5 w-1.5 rounded-full bg-amber2" />
      {children}
    </span>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-3xl border border-line bg-white shadow-card ${className}`}>{children}</div>;
}
