import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand Tokopudidi: hijau lumut UMKM, kuning hangat sebagai aksen.
        primary: {
          DEFAULT: '#2D6A4F',
          50:  '#F0F7F3',
          100: '#D6EADD',
          200: '#A9D2B6',
          300: '#7BB78F',
          400: '#4F9669',
          500: '#2D6A4F',
          600: '#235540',
          700: '#1A4030',
          800: '#112B20',
          900: '#091610',
        },
        secondary: {
          DEFAULT: '#F4A261',
          50:  '#FEF7EE',
          100: '#FCE7CC',
          200: '#F9CF99',
          300: '#F6B780',
          400: '#F4A261',
          500: '#E8853B',
          600: '#C26922',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '12px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
