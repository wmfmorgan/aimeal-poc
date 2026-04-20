import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: "var(--color-sage)",
        surface: "var(--color-surface)",
        ink: "var(--color-ink)",
        accent: "var(--color-accent)",
      },
      fontFamily: {
        display: ["Newsreader", "serif"],
        sans: ["Manrope", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
