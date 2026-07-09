import type { Config } from "tailwindcss";
import { THEME } from "@orbital/shared";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: THEME.background,
        "accent-teal": THEME.accentTeal,
        "accent-blue": THEME.accentBlue,
        "alert-amber": THEME.alertAmber,
        "alert-red": THEME.alertRed,
        "text-primary": THEME.textPrimary,
        "text-secondary": THEME.textSecondary,
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
