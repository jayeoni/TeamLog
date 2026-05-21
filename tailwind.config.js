/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // PULSE palette — also defined in src/index.css @theme block (Tailwind v4 source of truth)
        brand: {
          50:  '#F4FBC9',
          100: '#E8F89A',
          400: '#D4F560',
          500: '#C7F23A',
          600: '#A8D820',
          700: '#86AE19',
        },
        ink: {
          DEFAULT: '#0A0B0F',
          dark: '#E6E8EC',
        },
      },
      fontFamily: {
        sans: ['"Pretendard"', '"Noto Sans KR"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
