import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, weight } from '../../theme';
import { Icon } from '../icons/Icon';
import type { IconName } from '../../types';

interface Props {
  icon: IconName;
  title: string;
  subtitle?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<Props> = ({ icon, title, subtitle, compact = false }) => (
  <View style={[styles.wrap, { paddingVertical: compact ? 44 : 70 }]}>
    <View style={styles.circle}>
      <Icon name={icon} size={40} color={colors.inkDisabled} strokeWidth={1.8} />
    </View>
    <Text style={[styles.title, weight(700)]}>{title}</Text>
    {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 30 },
  circle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.neutralGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 15, color: colors.inkSecondary, textAlign: 'center' },
  sub: { fontSize: 12.5, color: colors.inkMuted2, marginTop: 4, textAlign: 'center' },
});
