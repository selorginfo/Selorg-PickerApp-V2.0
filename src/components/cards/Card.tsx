import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, shadows } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  elevated?: boolean;
  dark?: boolean;
}

export const Card: React.FC<Props> = ({ children, style, padded = true, elevated = true, dark = false }) => (
  <View
    style={[
      styles.base,
      dark ? styles.dark : styles.light,
      padded && styles.padded,
      !dark && elevated && shadows.card,
      style,
    ]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: { borderRadius: 18 },
  light: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dark: { backgroundColor: colors.inkGreen },
  padded: { padding: 18 },
});
