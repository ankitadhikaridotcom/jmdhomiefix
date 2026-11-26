import { fileURLToPath } from 'node:url';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    fileURLToPath(new URL('./index.html', import.meta.url)).replace(/\\/g, '/'),
    fileURLToPath(new URL('./src/**/*.{js,ts,jsx,tsx}', import.meta.url)).replace(/\\/g, '/'),
  ],
  theme: {
    extend: {
      colors: {
        // Stitch Warm Editorial Palette
        stitch: {
          bg: '#f7f5f0',
          surface: '#ebe8df',
          text: '#1a1a18',
          accent: {
            DEFAULT: '#b3261e',
            hover: '#9c2019',
          },
          muted: '#6a675f',
        },
        // HomeFix brand palette — matches logo colours
        primary: {
          50:  '#e8f4f8',
          100: '#c5e3ef',
          200: '#9fd0e5',
          300: '#6fbcd9',
          400: '#3facd1',
          500: '#20A5C2', // logo cyan
          600: '#1a8fab',
          700: '#147591',
          800: '#0e5b72',
          900: '#152D50', // logo navy
        },
        secondary: {
          50:  '#fff4ec',
          100: '#ffe2cc',
          200: '#ffc49a',
          300: '#ffa368',
          400: '#ff8840',
          500: '#FF7A1A', // logo orange
          600: '#e06200',
          700: '#b84e00',
          800: '#903c00',
          900: '#6b2d00',
        },
        navy: {
          DEFAULT: '#152D50',
          light:   '#1e3f6f',
          dark:    '#0d1e35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
