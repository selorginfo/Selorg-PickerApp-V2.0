import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, weight } from '../../theme';

interface Props {
  label: string;
  value: string;
  multiline?: boolean;
}

/** Read-only field block used in SUCCESS / view mode. */
export const ReadonlyField: React.FC<Props> = ({ label, value, multiline }) => (
  <View style={styles.wrap}>
    <Text style={[styles.label, weight(600)]}>{label}</Text>
    <View style={[styles.box, multiline && styles.boxMulti]}>
      <Text style={[styles.value, weight(600)]}>{value.trim() ? value : '—'}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, color: colors.ink, marginBottom: 6 },
  box: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.neutralGreenBg2,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  boxMulti: { minHeight: 88, paddingVertical: 12 },
  value: { fontSize: 15, color: colors.ink },
});
