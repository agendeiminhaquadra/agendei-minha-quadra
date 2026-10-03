/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          orange: "#FF7A00",
          DEFAULT: "#FF7A00",
        },
        orange: {
          500: "#FF8A00",
          400: "#FF9F1C",
        },
        yellow: {
          500: "#FFB703",
          DEFAULT: "#FFB000",
        },
        red: {
          orange: "#FF5A1F",
          DEFAULT: "#F04438",
        },
        dark: {
          DEFAULT: "#111827",
          secondary: "#1F2937",
        },
        background: "#FFF9F2",
        "background-light": "#FFF3E6",
        border: "#E5E7EB",
        text: {
          primary: "#111827",
          secondary: "#6B7280",
        },
        status: {
          available: "#16A34A",
          reserved: "#F04438",
          blocked: "#6B7280",
          pending: "#F59E0B",
          confirmed: "#16A34A",
          canceled: "#F04438",
        },
        sport: {
          futebol: "#16A34A",
          volei: "#FF8A00",
          futevolei: "#8B5CF6",
          beachTennis: "#F59E0B",
        },
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #FFB000 0%, #FF7A00 50%, #FF4D2E 100%)",
        "gradient-orange": "linear-gradient(135deg, #FFB703 0%, #FF7A00 100%)",
      },
      borderRadius: {
        card: "16px",
        button: "10px",
        input: "10px",
        modal: "20px",
      },
      boxShadow: {
        soft: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-plus-jakarta)", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
