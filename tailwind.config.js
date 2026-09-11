/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sparx: {
          bg: "#0a0a0a",
          elevated: "#121212",
          card: "#181818",
          hover: "#282828",
          green: "#1ed760",
          muted: "#b3b3b3",
          dim: "#6a6a6a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
