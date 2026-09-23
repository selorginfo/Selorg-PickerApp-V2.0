import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { colors, fontFamily } from '../../theme';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  length?: number;
  letterSpacing?: number;
}

/** Single wide monospace field with big tracking — mirrors the HTML OTP input. */
export const OtpInput: React.FC<Props> = ({ value, onChangeText, length = 4, letterSpacing = 18 }) => (
  <TextInput
    value={value}
    onChangeText={text => {
      const next = String(text ?? '').replace(/\D/g, '').slice(0, length);
      onChangeText(next);
    }}
    keyboardType="number-pad"
    maxLength={length}
    placeholder={'–'.repeat(length)}
    placeholderTextColor={colors.inkMuted}
    autoComplete="sms-otp"
    textContentType="oneTimeCode"
    importantForAutofill="yes"
    style={[styles.input, { letterSpacing }]}
    accessibilityLabel="One-time passcode"
  />
);

const styles = StyleSheet.create({
  input: {
    width: '100%',
    minHeight: 56,
    height: 66,
    maxHeight: 72,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '800',
    fontFamily: fontFamily.mono,
    color: colors.ink,
    paddingHorizontal: 12,
  },
});
