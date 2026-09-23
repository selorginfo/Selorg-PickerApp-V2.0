import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { TextField } from '../../components/inputs/TextField';
import { SegmentedControl } from '../../components/inputs/SegmentedControl';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { OutlineButton } from '../../components/buttons/OutlineButton';
import { VerifiedContactField } from '../../components/common/VerifiedContactField';
import { SavedSuccessBanner } from '../../components/common/SavedSuccessBanner';
import { ReadonlyField } from '../../components/common/ReadonlyField';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Skeleton } from '../../components/feedback/Skeleton';
import { colors, weight } from '../../theme';
import { useProfileForms } from '../../hooks/useProfileForms';
import { digitsOnly } from '../../utils/validators';
import { formatInPhone } from '../../utils/authContact';
import type { PersonalInfoForm } from '../../types';

type Mode = 'view' | 'edit';

export const PersonalInfoScreen: React.FC = () => {
  const form = useProfileForms();
  const errs = form.errorsFor('personal');
  const p = form.personal;
  const [mode, setMode] = useState<Mode>('view');
  const [justSaved, setJustSaved] = useState(false);
  const snapshotRef = useRef<PersonalInfoForm | null>(null);
  const contactSnapRef = useRef<{ phone: string; email: string } | null>(null);
  const modeInitialized = useRef(false);

  useFocusEffect(
    useCallback(() => {
      void form.reload({ silent: true });
    }, [form.reload]),
  );

  useEffect(() => {
    if (form.loading || modeInitialized.current) return;
    modeInitialized.current = true;
    setMode(form.hasPersonalData ? 'view' : 'edit');
  }, [form.loading, form.hasPersonalData]);

  // After a successful save/reload, switch to view when backend data is present.
  useEffect(() => {
    if (!form.loading && form.hasPersonalData && justSaved) {
      setMode('view');
    }
  }, [form.loading, form.hasPersonalData, justSaved]);

  const startEdit = useCallback(() => {
    snapshotRef.current = { ...form.personal };
    contactSnapRef.current = { phone: form.extraPhone, email: form.extraEmail };
    setJustSaved(false);
    setMode('edit');
  }, [form.personal, form.extraPhone, form.extraEmail]);

  const cancelEdit = useCallback(() => {
    if (snapshotRef.current) form.restorePersonal(snapshotRef.current);
    if (contactSnapRef.current) {
      form.setExtraPhone(contactSnapRef.current.phone);
      form.setExtraEmail(contactSnapRef.current.email);
    }
    setMode('view');
  }, [form]);

  const save = useCallback(async () => {
    if (form.saving) return;
    const ok = await form.save('personal', { navigateOnSuccess: false });
    if (ok) {
      setJustSaved(true);
      setMode('view');
    }
  }, [form]);

  if (form.loading && !form.hasPersonalData && mode !== 'edit') {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <AppHeader title="Personal information" />
        <View style={styles.body}>
          <Skeleton height={50} style={styles.skel} />
          <Skeleton height={50} style={styles.skel} />
          <Skeleton height={88} style={styles.skel} />
        </View>
      </Screen>
    );
  }

  if (form.loadError && !form.hasPersonalData) {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <AppHeader title="Personal information" />
        <ErrorState
          message={form.loadError}
          onRetry={() => {
            form.reload().catch(() => undefined);
          }}
        />
      </Screen>
    );
  }

  const phoneValue = form.authContact.phoneLocked
    ? form.primaryPhoneDisplay
    : form.extraPhone
      ? formatInPhone(form.extraPhone)
      : '';
  const emailValue = form.authContact.emailLocked
    ? form.primaryEmailDisplay
    : form.extraEmail;

  return (
    <Screen scroll keyboard={mode === 'edit'} edges={['top', 'bottom']}>
      <AppHeader title="Personal information" />
      <View style={styles.body}>
        {mode === 'view' && (justSaved || form.hasPersonalData) ? (
          <SavedSuccessBanner message="Details saved · tap Edit to update" />
        ) : null}

        {form.authContact.phoneLocked ? (
          <VerifiedContactField label="Phone number" value={phoneValue} />
        ) : mode === 'view' ? (
          <ReadonlyField label="Phone number" value={phoneValue} />
        ) : (
          <TextField
            label="Phone number"
            value={form.extraPhone}
            onChangeText={form.setExtraPhone}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="10-digit mobile number"
          />
        )}

        {form.authContact.emailLocked ? (
          <VerifiedContactField label="Email address" value={emailValue} />
        ) : mode === 'view' ? (
          <ReadonlyField label="Email address" value={emailValue} />
        ) : (
          <TextField
            label="Email address"
            value={form.extraEmail}
            onChangeText={form.setExtraEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="name@example.com"
          />
        )}

        {mode === 'view' ? (
          <>
            <ReadonlyField label="Alternate phone" value={p.altPhone} />
            <ReadonlyField label="Address" value={p.address} multiline />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <ReadonlyField label="City" value={p.city} />
              </View>
              <View style={styles.flex1}>
                <ReadonlyField label="Pincode" value={p.pincode} />
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={[styles.section, weight(800)]}>Emergency contact</Text>
            <ReadonlyField label="Contact name" value={p.emgName} />
            <ReadonlyField label="Contact phone" value={p.emgPhone} />
            <ReadonlyField label="Relationship" value={p.emgRel} />
            <PrimaryButton label="Edit details" onPress={startEdit} />
          </>
        ) : (
          <>
            <TextField
              label="Alternate phone (optional)"
              value={p.altPhone}
              onChangeText={t => form.setField('personal', 'altPhone', digitsOnly(t, 10))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="Add a backup number"
              error={errs.altPhone}
            />
            <TextField
              label="Address"
              value={p.address}
              onChangeText={t => form.setField('personal', 'address', t.slice(0, 250))}
              multiline
              maxLength={250}
              error={errs.address}
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <TextField
                  label="City"
                  value={p.city}
                  onChangeText={t => form.setField('personal', 'city', t.slice(0, 100))}
                  maxLength={100}
                  error={errs.city}
                />
              </View>
              <View style={styles.flex1}>
                <TextField
                  label="Pincode"
                  value={p.pincode}
                  onChangeText={t => form.setField('personal', 'pincode', digitsOnly(t, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  error={errs.pincode}
                />
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={[styles.section, weight(800)]}>Emergency contact</Text>
            <TextField
              label="Contact name"
              value={p.emgName}
              onChangeText={t => form.setField('personal', 'emgName', t.slice(0, 100))}
              maxLength={100}
              error={errs.emgName}
            />
            <TextField
              label="Contact phone"
              value={p.emgPhone}
              onChangeText={t => form.setField('personal', 'emgPhone', digitsOnly(t, 10))}
              keyboardType="number-pad"
              maxLength={10}
              error={errs.emgPhone}
            />
            <Text style={styles.label}>Relationship</Text>
            <View style={styles.segment}>
              <SegmentedControl
                options={['Spouse', 'Parent', 'Sibling', 'Friend'] as const}
                value={p.emgRel}
                onChange={v => form.setField('personal', 'emgRel', v)}
              />
            </View>

            <PrimaryButton
              label={form.saving ? 'Saving…' : form.hasPersonalData ? 'Save changes' : 'Submit'}
              onPress={() => {
                save().catch(() => undefined);
              }}
              loading={form.saving}
              disabled={form.saving}
            />
            {form.hasPersonalData ? (
              <OutlineButton
                label="Cancel"
                onPress={cancelEdit}
                color={colors.inkMuted}
                style={styles.cancel}
              />
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 28 },
  flex1: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, ...weight(600), color: colors.inkSecondary, marginBottom: 6 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
  section: { fontSize: 14, marginBottom: 14 },
  segment: { marginBottom: 20 },
  cancel: { marginTop: 12 },
  skel: { marginBottom: 14, borderRadius: 12 },
});
