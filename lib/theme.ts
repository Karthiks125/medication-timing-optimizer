export const theme = {
  colors: {
    // Green color palette
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    // Semantic color mappings
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    // Neutral grays
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    // Semantic colors
    background: '#ffffff',
    foreground: '#171717',
    card: '#ffffff',
    cardForeground: '#171717',
    border: '#e5e7eb',
    input: '#ffffff',
    ring: '#16a34a',
    // Status colors
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0891b2',
  },
  // Design tokens
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  // Typography scale
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// CSS custom properties for theme
export const cssVariables = {
  '--color-primary-50': theme.colors.primary[50],
  '--color-primary-100': theme.colors.primary[100],
  '--color-primary-200': theme.colors.primary[200],
  '--color-primary-300': theme.colors.primary[300],
  '--color-primary-400': theme.colors.primary[400],
  '--color-primary-500': theme.colors.primary[500],
  '--color-primary-600': theme.colors.primary[600],
  '--color-primary-700': theme.colors.primary[700],
  '--color-primary-800': theme.colors.primary[800],
  '--color-primary-900': theme.colors.primary[900],
  
  '--color-background': theme.colors.background,
  '--color-foreground': theme.colors.foreground,
  '--color-card': theme.colors.card,
  '--color-card-foreground': theme.colors.cardForeground,
  '--color-border': theme.colors.border,
  '--color-ring': theme.colors.ring,
  
  '--color-success': theme.colors.success,
  '--color-warning': theme.colors.warning,
  '--color-error': theme.colors.error,
  '--color-info': theme.colors.info,
  
  '--spacing-xs': theme.spacing.xs,
  '--spacing-sm': theme.spacing.sm,
  '--spacing-md': theme.spacing.md,
  '--spacing-lg': theme.spacing.lg,
  '--spacing-xl': theme.spacing.xl,
  '--spacing-2xl': theme.spacing['2xl'],
  
  '--radius-sm': theme.borderRadius.sm,
  '--radius-md': theme.borderRadius.md,
  '--radius-lg': theme.borderRadius.lg,
  '--radius-xl': theme.borderRadius.xl,
  '--radius-2xl': theme.borderRadius['2xl'],
  
  '--shadow-sm': theme.shadows.sm,
  '--shadow-md': theme.shadows.md,
  '--shadow-lg': theme.shadows.lg,
  '--shadow-xl': theme.shadows.xl,
} as const;

export type Theme = typeof theme;
