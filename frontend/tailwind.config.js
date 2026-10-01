export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f3f3f3",
        card: "#ffffff",
        stroke: "#d2d2d2",
        text: "#0f172a",
        placeholder: "#5a5a5a",
        "accent-1": "#0284c7",
        "accent-2": "#7651af",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};