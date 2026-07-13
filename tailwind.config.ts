import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        "brand-olive": "#556b2f",
        "brand-soft-orange": "#e9967a",
        "brand-green-light": "#88ab75",
        "brand-green-dark": "#4a5d3f",
        "brand-cream": "#fdfcfb",
        // Mocks (receta1–3): paleta editorial oliva / superficies
        "sv-primary": "#3e5219",
        "sv-on-primary": "#ffffff",
        "sv-secondary-container": "#dce7c3",
        "sv-on-secondary-container": "#5e684c",
        "sv-surface": "#f9f9f7",
        "sv-surface-low": "#f4f4f2",
        "sv-surface-high": "#e8e8e6",
        "sv-surface-highest": "#e2e3e1",
        "sv-on-surface": "#1a1c1b",
        "sv-on-surface-variant": "#45483c",
        "sv-outline": "#75796b",
        "sv-outline-variant": "#c5c8b8",
        "sv-primary-container": "#556b2f",
        "sv-on-primary-container": "#d0eba1",
        olive: {
          50: "#f7f8f3",
          100: "#eef1e6",
          200: "#dce7c3",
          500: "#6b8a3e",
          600: "#556b2f",
          700: "#4a5d29",
          800: "#3e5219"
        }
      },
      borderRadius: {
        lg: "0.75rem",
        md: "calc(0.75rem - 2px)",
        sm: "calc(0.75rem - 4px)"
      },
      fontFamily: {
        serif: ['"Noto Serif"', "Georgia", "Cambria", "Times New Roman", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
