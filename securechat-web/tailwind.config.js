/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#000000",
          light: "#F3F4F6",
          dark: "#1F2937",
        },
        sidebar: {
          DEFAULT: "#111111",
          dark: "#000000",
        },
        surface: {
          DEFAULT: "#F6F6F6",
          elevated: "#FFFFFF",
        },
        chat: {
          bg: "#F9F9F9",
        },
        message: {
          in: "#FFFFFF",
          out: "#1F2937",
        },
        text: {
          primary: "#111111",
          secondary: "#6B7280",
        },
        border: {
          DEFAULT: "#E5E7EB",
        },
        online: "#22C55E",
        typing: "#9CA3AF",
        unread: "#111111",
        danger: "#EF4444",
        warning: "#F59E0B",
        success: "#22C55E",
        dark: {
          bg: "#0A0A0A",
          sidebar: "#000000",
          surface: "#1A1A1A",
          message: {
            out: "#333333",
            in: "#1A1A1A",
          },
          text: "#FFFFFF",
          secondary: "#9CA3AF",
          border: "#2A2A2A",
        },
        glass: {
          light: "rgba(255,255,255,0.7)",
          dark: "rgba(26,26,26,0.7)",
        },
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        'premium': '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
        'premium-md': '0 4px 16px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.04)',
        'premium-lg': '0 8px 32px rgba(0,0,0,0.08), 0 16px 56px rgba(0,0,0,0.04)',
        'bubble': '0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        'bubble-out': '0 2px 8px rgba(0,0,0,0.12)',
        'nav': '0 1px 3px rgba(0,0,0,0.08)',
        'card': '0 2px 12px rgba(0,0,0,0.06)',
        'button': '0 2px 8px rgba(0,0,0,0.1)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
        '5xl': '28px',
        '6xl': '32px',
        '7xl': '36px',
      },
      backgroundImage: {
        'gradient-black': 'linear-gradient(180deg, #111111 0%, #000000 100%)',
        'gradient-white': 'linear-gradient(180deg, #FFFFFF 0%, #F6F6F6 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 100%)',
        'gradient-dark-glass': 'linear-gradient(135deg, rgba(26,26,26,0.8) 0%, rgba(26,26,26,0.2) 100%)',
        'chat-pattern-light': 'radial-gradient(circle at 30% 50%, rgba(0,0,0,0.02) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(0,0,0,0.01) 0%, transparent 50%)',
        'chat-pattern-dark': 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.02) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.01) 0%, transparent 50%)',
      },
    },
  },
  plugins: [],
}
