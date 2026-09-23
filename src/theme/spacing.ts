export const spacing = {
  xxs: 4,
  xs: 6,
  s: 8,
  sm: 10,
  m: 12,
  ml: 14,
  l: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  screenH: 16,
  screenHWide: 20,
} as const;

export const radius = {
  xs: 6,
  s: 8,
  sm: 9,
  m: 10,
  ml: 11,
  l: 12,
  xl: 13,
  xxl: 14,
  card: 16,
  cardLg: 18,
  cardXl: 20,
  hero: 22,
  sheet: 26,
  pill: 24,
  round: 999,
} as const;

export const shadows = {
  /** Soft elevated card shadow — separates white cards from white screen bg. */
  card: {
    shadowColor: 'rgba(16,40,24,1)',
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  toast: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  logo: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;
