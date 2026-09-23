export { colors } from './colors';
export type { ColorToken } from './colors';
export { fontFamily, weight, mono, text } from './typography';
export { spacing, radius, shadows } from './spacing';

export const theme = {
  colors: require('./colors').colors,
  spacing: require('./spacing').spacing,
  radius: require('./spacing').radius,
  shadows: require('./spacing').shadows,
} as const;
