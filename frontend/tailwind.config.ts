import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:       "var(--bg)",
        surface:  "var(--surface)",
        surface2: "var(--surface2)",
        surface3: "var(--surface3)",
        border:   "var(--border)",
        border2:  "var(--border2)",
        text:     "var(--text)",
        text2:    "var(--text2)",
        text3:    "var(--text3)",
        accent:   "var(--accent)",
        green:    "var(--green)",
        red:      "var(--red)",
        amber:    "var(--amber)",
        purple:   "var(--purple)",
      },
      fontFamily: {
        outfit:    ["var(--font-outfit)", "sans-serif"],
        "dm-serif":["var(--font-dm-serif)", "serif"],
      },
    },
  },
};
export default config;
