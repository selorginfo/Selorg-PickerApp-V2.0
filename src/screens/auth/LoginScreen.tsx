import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, weight, shadows } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../hooks/useUI';
import { useLayout, CONTENT_MAX_WIDTH } from '../../hooks/useLayout';
import { SegmentedControl } from '../../components/inputs/SegmentedControl';
import { Checkbox } from '../../components/inputs/Checkbox';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { config } from '../../constants/config';

const logo = require('../../assets/images/selorg-logo.jpg');

function openUrl(url: string, fallback: (msg: string) => void) {
  void Linking.openURL(url).catch(() => fallback('Unable to open link'));
}

export const LoginScreen: React.FC = () => {
  const auth = useAuth();
  const { toast } = useUI();
  const layout = useLayout();
  const isEmail = auth.channel === 'email';
  const isSignup = auth.intent === 'signup';
  const fieldLabel = isEmail
    ? 'Email address'
    : auth.channel === 'whatsapp'
      ? 'WhatsApp number'
      : 'Mobile number';

  const bandHeight = Math.min(280, Math.max(200, Math.round(layout.height * 0.32)));
  const logoSize = layout.cappedSize(88, 0.22);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.greenBand, { height: bandHeight }]} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>
            <View style={[styles.column, layout.isTablet && styles.columnTablet]}>
              <View style={styles.header}>
                <View style={[styles.logoWrap, { width: logoSize, height: logoSize, borderRadius: logoSize * 0.25 }]}>
                  <Image source={logo} style={styles.logo} />
                </View>
                <Text style={[styles.title, weight(800)]}>Selorg Picker</Text>
                <Text style={styles.subtitle}>
                  {isSignup
                    ? 'Create your workforce account'
                    : 'Sign in to your workforce account'}
                </Text>
              </View>

              <View style={styles.body}>
                <View style={styles.card}>
                  {!isSignup ? (
                    <>
                      <Text style={styles.cardLabel}>Choose login method</Text>
                      <View style={styles.segmentWrap}>
                        <SegmentedControl
                          variant="pill"
                          value={auth.channel}
                          onChange={auth.setChannel}
                          options={[
                            { label: 'Mobile', value: 'mobile' },
                            { label: 'WhatsApp', value: 'whatsapp' },
                            { label: 'Email', value: 'email' },
                          ]}
                        />
                      </View>
                    </>
                  ) : (
                    <Text style={styles.signupHint}>
                      Enter phone and email. We will send the OTP to your email.
                    </Text>
                  )}

                  {isSignup ? (
                    <>
                      <Text style={styles.fieldLabel}>Mobile number</Text>
                      <View style={styles.phoneRow}>
                        <View style={styles.prefix}>
                          <Text style={[styles.prefixText, weight(700)]}>IN +91</Text>
                        </View>
                        <View style={styles.phoneInputWrap}>
                          <TextInput
                            value={auth.loginPhone}
                            onChangeText={auth.setLoginPhone}
                            keyboardType="number-pad"
                            maxLength={10}
                            placeholder="10-digit number"
                            placeholderTextColor={colors.inkMuted}
                            style={styles.input}
                            testID="signup-phone"
                          />
                        </View>
                      </View>
                      <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Email address</Text>
                      <TextInput
                        value={auth.loginEmail}
                        onChangeText={auth.setLoginEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="you@example.com"
                        placeholderTextColor={colors.inkMuted}
                        style={styles.input}
                        testID="signup-email"
                      />
                    </>
                  ) : (
                    <>
                      <Text style={styles.fieldLabel}>{fieldLabel}</Text>
                      {isEmail ? (
                        <TextInput
                          value={auth.loginEmail}
                          onChangeText={auth.setLoginEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          placeholder="you@example.com"
                          placeholderTextColor={colors.inkMuted}
                          style={styles.input}
                        />
                      ) : (
                        <View style={styles.phoneRow}>
                          <View style={styles.prefix}>
                            <Text style={[styles.prefixText, weight(700)]}>IN +91</Text>
                          </View>
                          <View style={styles.phoneInputWrap}>
                            <TextInput
                              value={auth.loginPhone}
                              onChangeText={auth.setLoginPhone}
                              keyboardType="number-pad"
                              maxLength={10}
                              placeholder="10-digit number"
                              placeholderTextColor={colors.inkMuted}
                              style={styles.input}
                            />
                          </View>
                        </View>
                      )}
                    </>
                  )}

                  {auth.loginNotFound ? (
                    <Text style={styles.notFound}>
                      Account not found. Please create an account to continue.
                    </Text>
                  ) : null}
                  {auth.accountExists ? (
                    <Text style={styles.notFound}>
                      An account already exists with this{' '}
                      {isSignup || isEmail ? 'phone or email' : 'phone number'}. Please log in to
                      continue.
                    </Text>
                  ) : null}

                  <View style={styles.agreeWrap}>
                    <Checkbox checked={auth.agree} onToggle={auth.toggleAgree}>
                      <Text style={styles.agreeText}>
                        I agree to the{' '}
                        <Text style={styles.link} onPress={() => openUrl(config.termsUrl, toast)}>
                          Terms
                        </Text>{' '}
                        and{' '}
                        <Text style={styles.link} onPress={() => openUrl(config.privacyUrl, toast)}>
                          Privacy Policy
                        </Text>
                      </Text>
                    </Checkbox>
                  </View>

                  {auth.loginNotFound && !isSignup ? (
                    <PrimaryButton
                      label="Continue to Create Account"
                      onPress={() => auth.setIntent('signup')}
                      disabled={false}
                      style={styles.sendBtn}
                      testID="create-account"
                    />
                  ) : auth.accountExists ? (
                    <PrimaryButton
                      label="Switch to Log in"
                      onPress={() => {
                        auth.setIntent('login');
                      }}
                      disabled={false}
                      style={styles.sendBtn}
                      testID="login-existing"
                    />
                  ) : (
                    <PrimaryButton
                      label={
                        auth.busy
                          ? 'Sending…'
                          : isSignup
                            ? 'Send email OTP'
                            : 'Send OTP'
                      }
                      onPress={auth.sendOtp}
                      disabled={!auth.contactOk || !auth.agree}
                      loading={auth.busy}
                      style={styles.sendBtn}
                      testID="send-otp"
                    />
                  )}

                  {auth.loginNotFound || auth.accountExists ? null : (
                    <Pressable onPress={auth.toggleIntent} style={styles.switchBtn}>
                      <Text style={styles.switchText}>
                        {isSignup ? 'Already have an account? Log in' : 'New picker? Create account'}
                      </Text>
                    </Pressable>
                  )}
                </View>

                <Text style={styles.footer}>
                  Need help?{' '}
                  <Text
                    style={styles.link}
                    onPress={() => openUrl(`tel:${config.supportPhone.replace(/\s+/g, '')}`, toast)}>
                    Contact support
                  </Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  greenBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  column: { width: '100%', flexGrow: 1 },
  columnTablet: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  header: {
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 26,
    alignItems: 'center',
  },
  logoWrap: {
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: colors.white,
    ...shadows.logo,
  },
  logo: { width: '100%', height: '100%' },
  title: { fontSize: 24, color: colors.white, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.88)', marginTop: 6, textAlign: 'center' },
  body: { paddingHorizontal: 20, paddingBottom: 28, marginTop: -28, flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
    ...shadows.card,
  },
  cardLabel: { fontSize: 13, color: colors.inkSecondary, marginBottom: 10 },
  signupHint: {
    fontSize: 13,
    color: colors.inkSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  segmentWrap: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, ...weight(700), marginBottom: 8, color: colors.ink },
  fieldLabelSpaced: { marginTop: 14 },
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  prefix: {
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  prefixText: { fontSize: 14, color: colors.ink },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  phoneInputWrap: { flex: 1 },
  notFound: {
    marginTop: 12,
    fontSize: 12.5,
    color: colors.danger,
    lineHeight: 18,
  },
  agreeWrap: { marginTop: 18 },
  agreeText: { fontSize: 12.5, color: colors.inkSecondary, lineHeight: 18, flex: 1 },
  link: { color: colors.teal, ...weight(700) },
  sendBtn: { marginTop: 18 },
  switchBtn: { marginTop: 14, alignItems: 'center' },
  switchText: { fontSize: 12.5, color: colors.teal, ...weight(700) },
  footer: { textAlign: 'center', fontSize: 12.5, color: colors.inkMuted, marginTop: 22 },
});
