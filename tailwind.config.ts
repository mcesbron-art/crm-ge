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
        // Charte Groupe Écho
        noir: "#1A1A1A",
        "noir-deep": "#111111",
        dore: "#C5A55A",
        "dore-light": "#D4BA78",
        "dore-pale": "#F5EDD6",
        blanc: "#FFFFFF",
        gris: "#F7F7F5",
        "gris-moyen": "#999999",
        "gris-border": "#E5E5E3",
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
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-dm-serif-display)", "Georgia", "serif"],
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
