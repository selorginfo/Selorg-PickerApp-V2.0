import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons/Icon';
import { colors, weight } from '../../theme';
import type { IconName } from '../../types';

type Tone = 'success' | 'pending' | 'danger';

const TONE: Record<Tone, { bg: string; border: string; icon: string; text: string; glyph: IconName }> = {
  success: {
    bg: colors.primarySoftBg,
    border: colors.primaryTintBorder,
    icon: colors.primary,
    text: colors.primaryDark,
    glyph: 'check',
  },
  pending: {
    bg: colors.amberBg,
    border: colors.amberBorder,
    icon: colors.amber,
    text: colors.amberText,
    glyph: 'clock',
  },
  danger: {
    bg: colors.dangerBg,
    border: colors.dangerBorder,
    icon: colors.danger,
    text: colors.danger,
    glyph: 'alert',
  },
};

interface Props {
  message: string;
  tone?: Tone;
}

/** Shared success / status banner for Confirm → Success → Edit screens. */
export const SavedSuccessBanner: React.FC<Props> = ({ message, tone = 'success' }) => {
  const t = TONE[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Icon name={t.glyph} size={18} color={t.icon} strokeWidth={2} />
      <Text style={[styles.text, weight(600), { color: t.text }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  text: { flex: 1, fontSize: 12.5 },
});
