import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Charte Groupe Écho - Teal Premium
        noir: "#1A1A1A",
        "noir-deep": "#111111",
        // Teal palette
        teal: "#0D6B5F",
        "teal-dark": "#0D6B5F",
        "teal-accent": "#16A89C",
        "teal-light": "#A8D5D0",
        // Legacy (kept for compatibility)
        sidebar: "#0D6B5F",
        dore: "#C5A55A",
        "dore-light": "#D4BA78",
        "dore-pale": "#F5EDD6",
        blanc: "#FFFFFF",
        gris: "#F5F6F7",
        "gris-light": "#FAFAF9",
        "gris-moyen": "#999999",
        "gris-border": "#E0E3E6",
        // Statuts
        vert: "#4CAF50",
        "vert-bg": "#E8F5E9",
        orange: "#FF9800",
        "orange-bg": "#FFF3E0",
        rouge: "#E53935",
        "rouge-bg": "#FFEBEE",
        bleu: "#2196F3",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease",
        slideIn: "slideIn 0.3s ease",
        pulse: "pulse 1.5s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
