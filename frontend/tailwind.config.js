/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Nephora Brand Palette ──────────────────────────────
        primary: {
          DEFAULT: '#9dcee1',
          container: '#7fafc2',
          fixed: '#b9eafe',
          'fixed-dim': '#9dcee1',
        },
        'on-primary': '#003544',
        'on-primary-container': '#084353',
        'inverse-primary': '#346576',
        'surface-tint': '#9dcee1',

        secondary: {
          DEFAULT: '#94d3be',
          container: '#0d5343',
          fixed: '#b0f0da',
          'fixed-dim': '#94d3be',
        },
        'on-secondary': '#00382c',
        'on-secondary-container': '#86c5b0',

        tertiary: {
          DEFAULT: '#cbbefb',
          container: '#aca0da',
          fixed: '#e7deff',
          'fixed-dim': '#cbbefb',
        },
        'on-tertiary': '#33285a',
        'on-tertiary-container': '#403568',

        surface: {
          DEFAULT: '#0e1418',
          dim: '#0e1418',
          bright: '#343a3e',
          variant: '#2f363a',
          container: '#1a2024',
          'container-low': '#161c20',
          'container-high': '#252b2f',
          'container-highest': '#2f363a',
          'container-lowest': '#090f13',
        },
        'on-surface': '#dde3e9',
        'on-surface-variant': '#c0c8cb',
        'inverse-surface': '#dde3e9',
        'inverse-on-surface': '#2b3136',

        background: '#0e1418',
        'on-background': '#dde3e9',

        outline: '#8a9296',
        'outline-variant': '#41484b',

        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        },
        'on-error': '#690005',
        'on-error-container': '#ffdad6',
      },

      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display-xl': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg': ['32px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '500' }],
        'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-sm': ['12px', { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: '600' }],
      },

      spacing: {
        unit: '4px',
        gutter: '24px',
        'island-gap': '16px',
        'margin-page': '48px',
        'container-padding': '24px',
      },

      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        full: '9999px',
      },

      boxShadow: {
        'glow-cyan': '0 0 30px rgba(157, 206, 225, 0.25)',
        'glow-green': '0 0 30px rgba(148, 211, 190, 0.25)',
        'glow-lavender': '0 0 30px rgba(203, 190, 251, 0.25)',
        'nav': '0 24px 48px -12px rgba(0,0,0,0.5)',
      },

      backgroundImage: {
        'fog-radial': 'radial-gradient(circle at 50% 50%, rgba(148,211,190,0.06) 0%, rgba(157,206,225,0.06) 40%, transparent 70%)',
        'hero-blob-cyan': 'radial-gradient(circle, rgba(157,206,225,0.12) 0%, transparent 70%)',
        'hero-blob-green': 'radial-gradient(circle, rgba(148,211,190,0.12) 0%, transparent 70%)',
        'card-cyan': 'linear-gradient(135deg, rgba(157,206,225,0.1) 0%, rgba(157,206,225,0.02) 100%)',
        'card-green': 'linear-gradient(135deg, rgba(148,211,190,0.1) 0%, rgba(148,211,190,0.02) 100%)',
        'card-lavender': 'linear-gradient(135deg, rgba(203,190,251,0.1) 0%, rgba(203,190,251,0.02) 100%)',
      },

      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
        'float': 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
