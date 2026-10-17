import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0E1726", soft: "#4A5568", mute: "#8492A6" },
        paper: "#F5F8FA",
        line: "#E3E9EF",
        sync: { DEFAULT: "#0B7A5C", soft: "#E3F4EE", deep: "#075640" },
        alert: { DEFAULT: "#D6402F", soft: "#FDECE9" },
        amber2: { DEFAULT: "#B7791F", soft: "#FCF3DC" },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,23,38,0.04), 0 8px 24px -12px rgba(14,23,38,0.10)",
        lift: "0 2px 4px rgba(14,23,38,0.05), 0 20px 40px -16px rgba(11,122,92,0.28)",
      },
      keyframes: {
        rise: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "none" } },
        fill: { "0%": { width: "0%" }, "100%": { width: "var(--to)" } },
        pop: { "0%": { transform: "scale(0.6)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: {
        rise: "rise .35s ease-out both",
        fill: "fill 1.1s .25s cubic-bezier(.2,.8,.2,1) both",
        pop: "pop .45s cubic-bezier(.2,1.4,.4,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
