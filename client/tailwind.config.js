/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#000000",
          secondary: "#0a0a0a",
          panel: "#111111",
          header: "#1a1a1a",
        },
        accent: {
          orange: "#ff6600",
          amber: "#ffaa00",
        },
        term: {
          white: "#ffffff",
          gray: "#888888",
          green: "#00ff41",
          red: "#ff3333",
          border: "#333333",
        },
      },
      fontFamily: {
        mono: ["'IBM Plex Mono'", "'Courier New'", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": "0.65rem",
      },
    },
  },
  plugins: [],
};
