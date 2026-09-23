import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, weight } from '../../theme';
import { Icon } from '../icons/Icon';
import type { IconName } from '../../types';

interface Props {
  label: string;
  onPress: () => void;
  icon?: IconName;
  color?: string;
  height?: number;
  style?: ViewStyle;
  dashed?: boolean;
  disabled?: boolean;
  testID?: string;
}

export const OutlineButton: React.FC<Props> = ({
  label,
  onPress,
  icon,
  color = colors.primary,
  height = 52,
  style,
  dashed = false,
  disabled = false,
  testID,
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    style={({ pressed }) => [
      styles.btn,
      {
        height,
        borderColor: dashed ? '#9AC7A6' : color,
        borderStyle: dashed ? 'dashed' : 'solid',
        opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
      },
      style,
    ]}>
    <View style={styles.row}>
      {icon ? <Icon name={icon} size={17} color={color} strokeWidth={1.9} /> : null}
      <Text style={[styles.label, weight(700), { color }]}>{label}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14 },
});
