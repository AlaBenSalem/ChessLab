/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        board: {
          light: "#ebecd0",
          dark: "#739552",
        },
        brand: {
          green: "#2d5016",
          "green-light": "#4a7a2a",
          accent: "#f0c05a",
        },
        ui: {
          bg: "#f8f6f2",
          dark: "#1a1a1a",
          muted: "#6b6b6b",
        },
        badge: {
          brilliant: "#26c2a3",
          great: "#5b8def",
          best: "#81b64c",
          excellent: "#95bb4a",
          good: "#96af8b",
          book: "#a88865",
          inaccuracy: "#f7c631",
          miss: "#ff7769",
          mistake: "#e58f2a",
          blunder: "#ca3431",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
