/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0a0a0a",
        border: "#262626",
        accent: "#ffffff",
        accentSecondary: "#a3a3a3",
        muted: "#737373",
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-size": "40px 40px",
      },
    },
  },
  plugins: [],
};
