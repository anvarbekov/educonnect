/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'bounce-soft': 'bounceSoft 0.4s ease-out',
        'pulse-dot': 'pulseDot 1.5s infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSoft: {
          '0%': { transform: 'scale(0.95)' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          ...require('daisyui/src/theming/themes')['light'],
          primary: '#2563eb',
          'primary-content': '#ffffff',
          secondary: '#7c3aed',
          accent: '#0891b2',
          neutral: '#374151',
          'base-100': '#f8fafc',
          'base-200': '#f1f5f9',
          'base-300': '#e2e8f0',
          info: '#0284c7',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626',
        },
        dark: {
          ...require('daisyui/src/theming/themes')['dark'],
          primary: '#3b82f6',
          'primary-content': '#ffffff',
          secondary: '#8b5cf6',
          accent: '#06b6d4',
          neutral: '#1e293b',
          'base-100': '#0f172a',
          'base-200': '#1e293b',
          'base-300': '#334155',
          info: '#38bdf8',
          success: '#4ade80',
          warning: '#fbbf24',
          error: '#f87171',
        },
      },
    ],
    darkTheme: 'dark',
  },
};
