import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, weight, shadows } from '../../../theme';
import { Icon } from '../../../components/icons/Icon';
import { TextField } from '../../../components/inputs/TextField';
import { SegmentedControl } from '../../../components/inputs/SegmentedControl';
import { VerifiedContactField } from '../../../components/common/VerifiedContactField';
import { useOnboarding } from '../../../hooks/useOnboarding';
import { useStore } from '../../../store/AppStore';
import { profileApi } from '../../../services/api/profileApi';
import { formatInPhone, resolveAuthContact } from '../../../utils/authContact';
import { digitsOnly } from '../../../utils/validators';
import { GENDER_OPTIONS } from '../../../utils/gender';

export const Step1Profile: React.FC = () => {
  const ob = useOnboarding();
  const { state, dispatch } = useStore();
  const errs = ob.errorsFor('obProfile');
  const [loginMethod, setLoginMethod] = useState<string | null>(null);
  const [prefillDone, setPrefillDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let profilePhone: string | null = null;
      let profileEmail: string | null = null;
      let method: string | null = null;
      try {
        const p = await profileApi.getProfile();
        if (cancelled || !p) return;
        profilePhone = p.phone || null;
        profileEmail = p.email || null;
        method = p.loginMethod || null;
        setLoginMethod(method);
        if (p.name && !state.onboarding.profile.name) {
          dispatch({ type: 'ob/setField', section: 'obProfile', key: 'name', value: p.name });
        }
      } catch {
        // Auth-session contact still available below.
      }
      if (cancelled) return;

      const contact = resolveAuthContact({
        loginMethod: method,
        phone: profilePhone,
        email: profileEmail,
        channel: state.auth.channel,
        loginPhone: state.auth.loginPhone,
        loginEmail: state.auth.loginEmail,
      });

      if (contact.phone) {
        dispatch({ type: 'ob/setField', section: 'obProfile', key: 'phone', value: contact.phone });
      }
      if (contact.email) {
        dispatch({ type: 'ob/setField', section: 'obProfile', key: 'email', value: contact.email });
      }
      if (!cancelled) setPrefillDone(true);
    })().catch(() => {
      if (!cancelled) setPrefillDone(true);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contact = useMemo(() => {
    // Prefer API loginMethod once loaded. Before that, only trust session contact
    // filled during this OTP flow (loginPhone / loginEmail), not the default channel.
    const sessionMethod =
      state.auth.loginEmail && !state.auth.loginPhone
        ? 'email'
        : state.auth.loginPhone
          ? state.auth.channel === 'whatsapp'
            ? 'whatsapp'
            : 'mobile'
          : null;
    return resolveAuthContact({
      loginMethod: loginMethod || sessionMethod,
      phone: ob.profile.phone,
      email: ob.profile.email,
      channel: sessionMethod ? state.auth.channel : null,
      loginPhone: state.auth.loginPhone,
      loginEmail: state.auth.loginEmail,
    });
  }, [
    loginMethod,
    ob.profile.phone,
    ob.profile.email,
    state.auth.channel,
    state.auth.loginPhone,
    state.auth.loginEmail,
  ]);

  return (
    <View style={styles.card}>
      <Pressable style={styles.photoBtn} onPress={ob.upload}>
        <View style={styles.photoCircle}>
          <Icon name="user" size={34} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={[styles.photoLabel, weight(700)]}>Upload profile photo</Text>
      </Pressable>

      <TextField
        label="Full name"
        value={ob.profile.name}
        onChangeText={t => ob.setField('obProfile', 'name', t)}
        placeholder="Enter your full name"
        error={errs.name}
        maxLength={100}
      />
      <TextField
        label="Date of birth"
        value={ob.profile.dob}
        onChangeText={t => ob.setField('obProfile', 'dob', t)}
        placeholder="DD / MM / YYYY"
        keyboardType="numbers-and-punctuation"
        error={errs.dob}
        maxLength={14}
      />

      {contact.phoneLocked ? (
        <VerifiedContactField
          label="Phone number"
          value={formatInPhone(ob.profile.phone || contact.phone)}
        />
      ) : (
        <TextField
          label="Phone number"
          value={ob.profile.phone}
          onChangeText={t => ob.setField('obProfile', 'phone', digitsOnly(t, 10))}
          placeholder={prefillDone ? '10-digit mobile number' : 'Loading…'}
          keyboardType="number-pad"
          maxLength={10}
          error={errs.phone}
          editable={prefillDone}
        />
      )}

      {contact.emailLocked ? (
        <VerifiedContactField
          label="Email address"
          value={ob.profile.email || contact.email}
        />
      ) : (
        <TextField
          label="Email address"
          value={ob.profile.email}
          onChangeText={t => ob.setField('obProfile', 'email', t)}
          placeholder={prefillDone ? 'name@example.com' : 'Loading…'}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errs.email}
          editable={prefillDone}
        />
      )}

      <Text style={styles.label}>Gender</Text>
      <SegmentedControl
        variant="outline"
        options={GENDER_OPTIONS}
        value={ob.profile.gender}
        onChange={v => ob.setField('obProfile', 'gender', v)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 20, ...shadows.card },
  photoBtn: { alignItems: 'center', marginBottom: 20 },
  photoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoftBg,
    borderWidth: 2,
    borderColor: '#9AC7A6',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  photoLabel: { fontSize: 12.5, color: colors.primary },
  label: { fontSize: 12, ...weight(700), color: colors.ink, marginBottom: 8 },
});
