import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, weight } from '../../theme';

export const SectionLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text style={[styles.label, weight(800)]}>{children}</Text>
);

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginHorizontal: 2,
  },
});
