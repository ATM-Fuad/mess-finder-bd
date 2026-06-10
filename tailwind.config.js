/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:   ["Plus Jakarta Sans", "Hind Siliguri", "system-ui", "sans-serif"],
        bangla: ["Hind Siliguri", "Plus Jakarta Sans", "sans-serif"],
      },
      colors: {
        base:    "#FAFAF8",
        surface: "#FFFFFF",
        border:  "#E8E8E4",
        primary: {
          50:  "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
        "5xl": "2rem",
      },
      boxShadow: {
        card:    "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        hover:   "0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        soft:    "0 1px 4px rgba(0,0,0,0.06)",
        glass:   "0 8px 32px rgba(0,0,0,0.08)",
        orange:  "0 4px 14px rgba(249,115,22,0.35)",
      },
      animation: {
        "fade-in":    "fadeInUp 0.3s ease both",
        "fade-in-sm": "fadeInUp 0.2s ease both",
        shimmer:      "shimmer 1.4s infinite linear",
        "count-up":   "countUp 0.5s ease both",
        "scale-in":   "scaleIn 0.2s ease both",
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-800px 0" },
          "100%": { backgroundPosition:  "800px 0" },
        },
        countUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
