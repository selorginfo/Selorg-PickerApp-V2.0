import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { OtpInput } from '../../components/inputs/OtpInput';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { colors, weight, shadows } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useLayout } from '../../hooks/useLayout';
import { isOtp4 } from '../../utils/validators';

const logo = require('../../assets/images/selorg-logo.jpg');

export const OtpScreen: React.FC = () => {
  const auth = useAuth();
  const layout = useLayout();
  const letterSpacing = layout.isCompact ? 12 : layout.isTablet ? 22 : 18;

  return (
    <Screen scroll keyboard edges={['top', 'bottom']}>
      <AppHeader title="Verify OTP" />
      <View style={styles.body}>
        <View style={styles.card}>
          <Image source={logo} style={styles.logo} />
          <Text style={[styles.title, weight(800)]}>Verify OTP</Text>
          <Text style={styles.desc}>
            Enter the 4-digit OTP sent to <Text style={styles.strong}>{auth.otpDest}</Text> via{' '}
            <Text style={styles.strong}>{auth.otpChannelLabel}</Text>.
          </Text>

          <OtpInput
            value={auth.otp}
            onChangeText={auth.setOtp}
            length={4}
            letterSpacing={letterSpacing}
          />

          <View style={styles.resendRow}>
            {auth.resendIn <= 0 ? (
              auth.resending ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Pressable onPress={auth.resendOtp} hitSlop={8} disabled={auth.busy || auth.resending}>
                  <Text style={[styles.resendActive, weight(700)]}>Resend OTP</Text>
                </Pressable>
              )
            ) : (
              <Text style={styles.resendWaiting}>Resend OTP in {auth.resendIn}s</Text>
            )}
          </View>

          <PrimaryButton
            label="Verify & Continue"
            onPress={auth.verifyOtp}
            disabled={!isOtp4(auth.otp)}
            loading={auth.busy}
            testID="verify-otp"
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 22, paddingTop: 32 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 24,
    ...shadows.card,
  },
  logo: { width: 60, height: 60, borderRadius: 16, alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 20, textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 13.5, color: colors.inkSecondary, lineHeight: 22, textAlign: 'center', marginBottom: 26 },
  strong: { color: colors.primary, ...weight(700) },
  resendRow: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  resendActive: { color: colors.primary, fontSize: 13 },
  resendWaiting: { color: colors.inkMuted, fontSize: 13 },
});
