import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, weight, shadows } from '../../theme';

interface Props {
  title: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}

/** Radio row used by onboarding location/shift + device-issue sheet. */
export const RadioCard: React.FC<Props> = ({ title, sub, selected, onPress, compact = false }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    style={[
      styles.row,
      compact && styles.compact,
      { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoftBg : colors.surface },
    ]}>
    <View style={[styles.dot, { borderColor: selected ? colors.primary : colors.inkDisabled }]}>
      {selected ? <View style={styles.inner} /> : null}
    </View>
    <View style={styles.textWrap}>
      <Text style={[styles.title, weight(compact ? 700 : 800)]}>{title}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    ...shadows.card,
  },
  compact: { borderRadius: 13, padding: 14 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  textWrap: { flex: 1 },
  title: { fontSize: 14, color: colors.ink },
  sub: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
});
