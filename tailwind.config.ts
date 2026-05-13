import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          bg: "#FAFAF7",
          text: "#1A1A1A",
          muted: "#8B8680",
          border: "#E8E4DC",
          accent: "#C97B5C"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        serif: ["var(--font-fraunces)", "Fraunces", "serif"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(26, 26, 26, 0.08)"
      }
    }
  },
  plugins: [forms]
};

export default config;
