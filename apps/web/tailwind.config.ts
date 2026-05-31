import type { Config } from 'tailwindcss';

// Token desain Tokopudidi — diturunkan dari handoff (hijau primer + aksen merah).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1FA463',
          50:  '#e8f5ee',
          100: '#d2ecdd',
          200: '#a6d9bc',
          300: '#79c69b',
          400: '#4dbf82',
          500: '#1FA463',
          600: '#18935a',
          700: '#147a4a',
          800: '#0f5e39',
          900: '#0a4128',
        },
        accent: {
          DEFAULT: '#e5484d',
          tint:    '#fdecec',
        },
        ink: {
          DEFAULT: '#2e3137',
          soft:    '#3a3e45',
          muted:   '#8a8f96',
        },
        line: {
          DEFAULT: '#ededed',
          dark:    '#d4d7da',
        },
        page: '#f3f4f5',
        star: '#ffb700',
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '12px',
        pill: '22px',
      },
      maxWidth: {
        wrap: '1208px',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card-hover': '0 6px 20px rgba(0,0,0,0.10)',
        fab:          '0 4px 16px rgba(0,0,0,0.14)',
        toast:        '0 8px 28px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
