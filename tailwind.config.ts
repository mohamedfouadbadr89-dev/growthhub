import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8f9ff",
        foreground: "#05345c",
        card: "#ffffff",
        primary: "#005bc4", // Linear Precision Authoritative Blue
        border: "#91b4e4",  // Ghost Border Token
        secondary: {
          DEFAULT: "#575f72",
          container: "#dbe2f9",
        },
        slate: {
          100: "rgba(145, 180, 228, 0.15)", // Specialized Ghost Border
        },
      },
      boxShadow: {
        "modern-saas": "0 16px 32px rgba(5, 52, 92, 0.06)",
      },
      borderRadius: {
        "xl": "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
