import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { Icon } from '../icons/Icon';

interface Props {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  radius?: number;
  children?: React.ReactNode;
}

export const Checkbox: React.FC<Props> = ({ checked, onToggle, size = 22, radius = 6, children }) => (
  <Pressable onPress={onToggle} style={styles.row} accessibilityRole="checkbox" accessibilityState={{ checked }}>
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderColor: checked ? colors.primary : colors.inkDisabled,
          backgroundColor: checked ? colors.primary : colors.surface,
        },
      ]}>
      {checked ? <Icon name="check" size={size * 0.6} color={colors.white} strokeWidth={3.2} /> : null}
    </View>
    {children}
  </Pressable>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
