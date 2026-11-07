/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Panopter Design Tokens ──────────────────────────────
        // Backgrounds
        'p-bg':        '#0f0d0e',   // Main page background — deepest charcoal
        'p-bg-mid':    '#141214',   // Mid-level background
        'p-surface':   '#1a1719',   // Cards, panels — slightly lighter
        'p-surface-2': '#201d1f',   // Elevated surface
        'p-sidebar':   '#16111a',   // Sidebar — dark charcoal with burgundy tone

        // Accents
        'p-accent':    '#6b2037',   // Primary accent — dark burgundy
        'p-accent-2':  '#8b2541',   // Hover / active state
        'p-crimson':   '#c0334d',   // Action accent — crimson
        'p-crimson-2': '#e0455f',   // Hover crimson

        // Text
        'p-text':      '#f0eae8',   // Warm white — primary text
        'p-text-2':    '#a89fa3',   // Muted grey — secondary text
        'p-text-3':    '#6b6068',   // Dim — tertiary / placeholder

        // Borders
        'p-border':    '#2a2428',   // Subtle dark grey border
        'p-border-2':  '#3a3337',   // Slightly lighter border

        // Status
        'p-success':   '#2a6b4a',   // Restrained green
        'p-success-2': '#38a169',   // Success text
        'p-warning':   '#8a6a1e',   // Amber bg
        'p-warning-2': '#d4a53a',   // Warning text
        'p-error':     '#7a2030',   // Error bg
        'p-error-2':   '#e05060',   // Error text
        'p-info':      '#1e4a7a',   // Info bg
        'p-info-2':    '#4a9edd',   // Info text

        // Priority
        'p-critical':  '#c0334d',
        'p-high':      '#d4733a',
        'p-moderate':  '#d4a53a',
        'p-low':       '#4a9edd',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'p': '6px',
        'p-lg': '10px',
        'p-xl': '14px',
      },
      boxShadow: {
        'p-sm': '0 1px 3px rgba(0,0,0,0.4)',
        'p-md': '0 4px 12px rgba(0,0,0,0.5)',
        'p-lg': '0 8px 24px rgba(0,0,0,0.6)',
        'p-glow': '0 0 20px rgba(192,51,77,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideIn: {
          from: { transform: 'translateX(-8px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
