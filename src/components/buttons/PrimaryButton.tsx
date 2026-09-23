import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, weight } from '../../theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
  height?: number;
  fontSize?: number;
  style?: ViewStyle;
  testID?: string;
}

export const PrimaryButton: React.FC<Props> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  danger = false,
  height = 54,
  fontSize = 16,
  style,
  testID,
}) => {
  const [pressed, setPressed] = useState(false);
  const blocked = disabled || loading;
  const bg =
    loading
      ? danger
        ? colors.danger
        : colors.primary
      : disabled
        ? colors.buttonDisabled
        : danger
          ? colors.danger
          : colors.primary;
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (!blocked) onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked }}
      style={[styles.btn, { backgroundColor: bg, height, opacity: pressed && !blocked ? 0.9 : 1 }, style]}>
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={[styles.label, weight(800), { fontSize }]}>{label}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  label: { color: colors.white },
});
