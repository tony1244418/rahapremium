/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#edf4ff',
          100: '#dceaff',
          200: '#b2d4ff',
          300: '#82b9ff',
          400: '#4d97ff',
          500: '#1e6bef',
          600: '#1152df',
          700: '#0e41b5',
          800: '#0f3593',
          900: '#123174',
          950: '#0c1e4b'
        },
        blue: {
          50: '#edf4ff',
          100: '#dceaff',
          200: '#b2d4ff',
          300: '#82b9ff',
          400: '#4d97ff',
          500: '#1e6bef',
          600: '#1152df',
          700: '#0e41b5',
          800: '#0f3593',
          900: '#123174',
          950: '#0c1e4b'
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e'
        }
      },
      backgroundImage: {
        'main-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        'primary-gradient': 'linear-gradient(135deg, #0f3593 0%, #1e6bef 50%, #4d97ff 100%)',
        'red-gradient': 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
        'accent-gradient': 'linear-gradient(135deg, #a21caf 0%, #c026d3 50%, #d946ef 100%)',
        'blue-gradient': 'linear-gradient(135deg, #0f3593 0%, #1e6bef 50%, #4d97ff 100%)',
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [],
}
