/** @type {import('tailwindcss').Config} */
const c = (name) => `rgb(var(--g-${name}) / <alpha-value>)`;

export default {
  content: ['./popup.html', './dashboard.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        g: {
          bg: c('bg'), // panel / dialog surface
          canvas: c('canvas'), // app background
          surface: c('surface'), // search bar, subtle containers
          hover: c('hover'),
          nav: c('nav'), // selected nav / selection
          tonal: c('tonal'),
          onTonal: c('on-tonal'),
          blue: c('blue'),
          blueHover: c('blue-hover'),
          blueSoft: c('blue-soft'),
          onBlue: c('on-blue'),
          red: c('red'),
          green: c('green'),
          yellow: c('yellow'),
          text: c('text'),
          sub: c('sub'),
          border: c('border'),
        },
      },
      fontFamily: {
        sans: ['"Google Sans"', 'Roboto', 'system-ui', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        g1: '0 1px 2px 0 rgba(0,0,0,.30), 0 1px 3px 1px rgba(0,0,0,.15)',
        g2: '0 1px 2px 0 rgba(0,0,0,.30), 0 2px 6px 2px rgba(0,0,0,.15)',
        g3: '0 4px 8px 3px rgba(0,0,0,.15), 0 1px 3px 0 rgba(0,0,0,.30)',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: 'scale(.92)' }, to: { opacity: 1, transform: 'scale(1)' } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        fadeIn: 'fadeIn 150ms cubic-bezier(.2,0,0,1)',
        scaleIn: 'scaleIn 200ms cubic-bezier(.2,0,0,1)',
        slideUp: 'slideUp 250ms cubic-bezier(.2,0,0,1)',
      },
      transitionTimingFunction: { emphasized: 'cubic-bezier(.2,0,0,1)' },
    },
  },
  plugins: [],
};
