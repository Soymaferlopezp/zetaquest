/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        press: ["var(--font-press)", "monospace"],
      },
    },
  },
  plugins: [],
};

