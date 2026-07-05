/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false, // Protects non-pharmacist dashboards from CSS resets
  },
  theme: {
    extend: {
      colors: {
        hospital: {
          primary: '#0ea5e9',      // Medical blue primary color
          primaryHover: '#0284c7',
          success: '#16a34a',      // Green success color
          warning: '#f59e0b',      // Orange warning color
          emergency: '#dc2626',    // Red emergency color
          softBlue: '#e0f2fe',
          surface: '#ffffff',
          darkBg: '#0f172a',
          darkSurface: '#1e293b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 4px 12px rgba(14, 165, 233, 0.04)',
        'soft-md': '0 8px 24px rgba(14, 165, 233, 0.08)',
        'soft-lg': '0 16px 48px rgba(14, 165, 233, 0.12)',
      }
    },
  },
  plugins: [],
}
