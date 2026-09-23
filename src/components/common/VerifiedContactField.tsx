import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBadge } from '../badges/StatusBadge';
import { colors, weight } from '../../theme';

interface Props {
  label: string;
  value: string;
  verified?: boolean;
}

/** Read-only contact row with optional Verified badge (login identity). */
export const VerifiedContactField: React.FC<Props> = ({ label, value, verified = true }) => (
  <View style={styles.wrap}>
    <Text style={[styles.label, weight(600)]}>{label}</Text>
    <View style={styles.box}>
      <Text style={[styles.value, weight(600)]} numberOfLines={1}>
        {value.trim() ? value : '—'}
      </Text>
      {verified ? <StatusBadge label="Verified" tone="success" small /> : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    gap: 10,
  },
  value: { flex: 1, fontSize: 15, color: colors.ink },
});
