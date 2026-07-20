import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        sky: {
          50: "hsl(157 70% 96%)",
          100: "hsl(157 70% 90%)",
          200: "hsl(157 70% 80%)",
          300: "hsl(157 70% 68%)",
          400: "hsl(157 70% 55%)",
          500: "hsl(157 70% 42%)",
          600: "hsl(157 70% 35%)",
          700: "hsl(157 70% 28%)",
          800: "hsl(157 70% 22%)",
          900: "hsl(157 70% 16%)",
          950: "hsl(157 70% 9%)"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px"
      },
      boxShadow: {
        panel: "0 8px 22px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
