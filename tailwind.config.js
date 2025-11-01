const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [ "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Hier kannst du benutzerdefinierte Farben hinzufügen
        'desktop-blau': '#7C9AA6',
        'desktop-weiß': '#D9D9D9',
        'desktop-pink': '#F2A2CE',

      },
      fontSize: {
        'display-font-size': '11rem', 
      },
      fontFamily: {
        // 'serif' ist hier der Name, den du in Tailwind verwendest (z.B. font-serif).
        // Du könntest es auch 'instrument' nennen (für font-instrument).
        'serif': ['"Instrument Serif"', ...defaultTheme.fontFamily.serif],
      },
    },
},
  plugins: [],
}

