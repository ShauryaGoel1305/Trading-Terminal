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
      boxShadow: {
        "glow-orange": "0 0 0 1px rgba(255,102,0,0.4), 0 0 24px -4px rgba(255,102,0,0.35)",
        "glow-amber": "0 0 0 1px rgba(255,170,0,0.35), 0 0 20px -4px rgba(255,170,0,0.3)",
        "glow-green": "0 0 0 1px rgba(0,255,65,0.35), 0 0 20px -4px rgba(0,255,65,0.3)",
        "glow-purple": "0 0 0 1px rgba(168,85,247,0.4), 0 0 24px -4px rgba(168,85,247,0.35)",
        "glow-cyan": "0 0 0 1px rgba(34,211,238,0.4), 0 0 24px -4px rgba(34,211,238,0.35)",
        panel: "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -8px rgba(0,0,0,0.5)",
        "panel-hover": "0 1px 2px rgba(0,0,0,0.5), 0 12px 32px -6px rgba(0,0,0,0.6)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        flashUp: {
          "0%": { backgroundColor: "rgba(0,255,65,0.22)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashDown: {
          "0%": { backgroundColor: "rgba(255,51,51,0.22)" },
          "100%": { backgroundColor: "transparent" },
        },
        shimmerSweep: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.45s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fadeIn 0.35s ease-out both",
        "scale-in": "scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "flash-up": "flashUp 0.9s ease-out",
        "flash-down": "flashDown 0.9s ease-out",
        "shimmer-sweep": "shimmerSweep 2.2s linear infinite",
        "gradient-shift": "gradientShift 6s ease infinite",
      },
    },
  },
  plugins: [],
};
