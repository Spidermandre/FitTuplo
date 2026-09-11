/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Scala di opacità estesa: usata dai modificatori tipo text-ink/85, border-ink/12.
      opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, String(i / 100)])),
      colors: {
        // Base FitExpress: giallo con lettere nere
        brand: {
          50: '#FFFDF0',
          100: '#FFF8CC',
          200: '#FFF08F',
          300: '#FFE75C',
          400: '#FFDE2E',
          500: '#FFD400',
          600: '#E6BE00',
          700: '#B89800',
          800: '#7A6500',
          900: '#3D3300',
        },
        ink: {
          DEFAULT: '#0B0B0C',
          soft: '#1B1B1E',
          mute: '#4A4A4F',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Inter',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        glass: '1.75rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.55)',
        'glass-sm': '0 4px 16px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.45)',
        lift: '0 12px 40px rgba(0,0,0,0.22)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        pop: {
          '0%': { transform: 'scale(0.94)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        floaty: {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(0,-18px,0) scale(1.04)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.6s ease-in-out infinite',
        pop: 'pop 220ms cubic-bezier(0.22,1,0.36,1)',
        floaty: 'floaty 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
