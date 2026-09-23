import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, weight } from '../../theme';
import type { BadgeTone } from '../../types';

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.primarySoftBg, fg: colors.primary },
  warning: { bg: colors.amberBg, fg: colors.amberText },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  neutral: { bg: colors.neutralGreenBg, fg: colors.inkSecondary },
  info: { bg: colors.tealBg, fg: colors.tealDeep },
};

interface Props {
  label: string;
  tone?: BadgeTone;
  small?: boolean;
}

export const StatusBadge: React.FC<Props> = ({ label, tone = 'success', small = false }) => {
  const c = TONES[tone];
  return (
    <Text
      style={[
        styles.badge,
        weight(800),
        { backgroundColor: c.bg, color: c.fg, fontSize: small ? 11 : 11.5, paddingVertical: small ? 3 : 4 },
      ]}>
      {label}
    </Text>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, borderRadius: 8, overflow: 'hidden' },
});
