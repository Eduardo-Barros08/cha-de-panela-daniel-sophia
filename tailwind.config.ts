import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bamboo: {
          50: "#faf8f2",
          100: "#f3efe3",
          200: "#e6dcc4",
          300: "#d6c69e",
          400: "#c4ad76",
          500: "#b39556",
        },
        inox: {
          100: "#f1f3f4",
          200: "#dfe3e6",
          400: "#9aa3aa",
          600: "#5b646b",
          800: "#2c3236",
        },
        ink: "#1a1a1a",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Jost", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
