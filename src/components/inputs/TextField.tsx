import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, weight } from '../../theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  multiline?: boolean;
  hint?: string;
}

export const TextField: React.FC<Props> = ({ label, value, onChangeText, error, multiline, hint, ...rest }) => {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.inputBorderError : focused ? colors.inputBorderFocus : colors.inputBorder;
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, weight(600)]}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline={multiline}
        placeholderTextColor={colors.inkMuted}
        style={[styles.input, multiline ? styles.multiline : styles.single, { borderColor }]}
        {...rest}
      />
      {error ? <Text style={[styles.error, weight(600)]}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, color: colors.ink, marginBottom: 6 },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: colors.inputFill,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  single: { height: 50, paddingHorizontal: 14 },
  multiline: { minHeight: 88, padding: 12, textAlignVertical: 'top' },
  error: { fontSize: 11.5, color: colors.danger, marginTop: 6 },
  hint: { fontSize: 11.5, color: colors.inkMuted, marginTop: 6 },
});
