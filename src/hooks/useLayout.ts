/**
 * Responsive layout helpers — width/height driven, not device-model specific.
 * Recomputes on rotation / window resize via useWindowDimensions.
 */
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { spacing } from '../theme';

export const BREAKPOINTS = {
  compact: 360,
  phone: 430,
  largePhone: 600,
  tablet: 768,
  largeTablet: 1024,
} as const;

/** Comfortable reading column on tablets; phones use full width. */
export const CONTENT_MAX_WIDTH = 560;

export function useLayout() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const shortest = Math.min(width, height);
    const landscape = width > height;
    const isTablet = shortest >= BREAKPOINTS.tablet || width >= BREAKPOINTS.tablet;
    const isCompact = width < BREAKPOINTS.compact;
    const horizontalPadding = isTablet
      ? width >= BREAKPOINTS.largeTablet
        ? spacing.xxxl + spacing.l
        : spacing.xxxl
      : isCompact
        ? spacing.l
        : spacing.xxl;

    const contentMaxWidth = isTablet ? CONTENT_MAX_WIDTH : width;
    const contentWidth = Math.min(width - horizontalPadding * 2, contentMaxWidth);

    return {
      width,
      height,
      shortest,
      isLandscape: landscape,
      isTablet,
      isLargeTablet: width >= BREAKPOINTS.largeTablet || height >= BREAKPOINTS.largeTablet,
      isCompact,
      horizontalPadding,
      contentMaxWidth,
      contentWidth,
      /** Cap a decorative size so it never exceeds a fraction of the shorter side. */
      cappedSize: (preferred: number, fraction = 0.45) =>
        Math.min(preferred, Math.round(shortest * fraction)),
    };
  }, [width, height]);
}
