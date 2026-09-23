import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, weight } from '../../theme';

interface Props {
  label: string;
  value: React.ReactNode;
  last?: boolean;
  valueColor?: string;
}

export const KeyValueRow: React.FC<Props> = ({ label, value, last = false, valueColor = colors.ink }) => (
  <View style={[styles.row, !last && styles.divider]}>
    <Text style={styles.label}>{label}</Text>
    {typeof value === 'string' ? (
      <Text style={[styles.value, weight(700), { color: valueColor }]}>{value}</Text>
    ) : (
      value
    )}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderHair },
  label: { fontSize: 13.5, color: colors.inkSecondary },
  value: { fontSize: 13.5 },
});
