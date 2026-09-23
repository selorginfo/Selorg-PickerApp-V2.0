import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Icon } from '../../components/icons/Icon';
import { TextField } from '../../components/inputs/TextField';
import { SegmentedControl } from '../../components/inputs/SegmentedControl';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { OutlineButton } from '../../components/buttons/OutlineButton';
import { SavedSuccessBanner } from '../../components/common/SavedSuccessBanner';
import { ReadonlyField } from '../../components/common/ReadonlyField';
import { VerifiedContactField } from '../../components/common/VerifiedContactField';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Skeleton } from '../../components/feedback/Skeleton';
import { colors, weight } from '../../theme';
import { useProfileForms } from '../../hooks/useProfileForms';
import { displayPickerGender, GENDER_OPTIONS } from '../../utils/gender';
import { useUI } from '../../hooks/useUI';
import { profileApi } from '../../services/api/profileApi';
import { ApiError } from '../../services/api/client';
import { initialsFromName } from '../../services/api/mappers';
import { pickProfilePhoto } from '../../services/media/pickDocumentImage';
import { digitsOnly } from '../../utils/validators';
import { formatInPhone } from '../../utils/authContact';
import type { EditProfileForm } from '../../types';

type Mode = 'view' | 'edit';

export const EditProfileScreen: React.FC = () => {
  const form = useProfileForms();
  const { toast } = useUI();
  const errs = form.errorsFor('edit');
  const [mode, setMode] = useState<Mode>('view');
  const [uploading, setUploading] = useState(false);
  const [draftPhoto, setDraftPhoto] = useState<string | null>(null);
  const snapshotRef = useRef<EditProfileForm | null>(null);
  const photoSnapRef = useRef<string | null>(null);
  const modeInitialized = useRef(false);

  useEffect(() => {
    if (form.loading || modeInitialized.current) return;
    modeInitialized.current = true;
    setMode(form.hasEditData ? 'view' : 'edit');
  }, [form.loading, form.hasEditData]);

  const displayPhoto = draftPhoto ?? form.photoUri;
  const initials = initialsFromName(form.edit.name) || 'P';

  const startEdit = useCallback(() => {
    snapshotRef.current = { ...form.edit };
    photoSnapRef.current = form.photoUri;
    setDraftPhoto(form.photoUri);
    setMode('edit');
  }, [form.edit, form.photoUri]);

  const cancelEdit = useCallback(() => {
    if (snapshotRef.current) form.restoreEdit(snapshotRef.current);
    setDraftPhoto(photoSnapRef.current);
    form.setPhotoUri(photoSnapRef.current);
    setMode('view');
  }, [form]);

  const changePhoto = useCallback(async () => {
    if (uploading || mode !== 'edit') return;
    const picked = await pickProfilePhoto();
    if (!picked) return;

    const previous = displayPhoto;
    setDraftPhoto(picked.uri);
    setUploading(true);
    try {
      const stored = await profileApi.uploadAvatar(picked.uri, {
        fileName: picked.fileName,
        mimeType: picked.mimeType,
      });
      const url = stored?.url || picked.uri;
      setDraftPhoto(url);
      form.setPhotoUri(url);
      toast('Profile photo updated');
    } catch (e) {
      setDraftPhoto(previous);
      toast(e instanceof ApiError ? e.message : 'Could not upload photo');
    } finally {
      setUploading(false);
    }
  }, [displayPhoto, form, mode, toast, uploading]);

  const save = useCallback(async () => {
    if (form.saving || uploading) return;
    const ok = await form.save('edit', { navigateOnSuccess: false });
    if (ok) setMode('view');
  }, [form, uploading]);

  if (form.loading) {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <AppHeader title="Profile" />
        <View style={styles.body}>
          <Skeleton height={96} style={styles.skelAvatar} />
          <Skeleton height={50} style={styles.skelRow} />
          <Skeleton height={50} style={styles.skelRow} />
          <Skeleton height={50} style={styles.skelRow} />
        </View>
      </Screen>
    );
  }

  if (form.loadError && !form.hasEditData) {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <AppHeader title="Profile" />
        <ErrorState message={form.loadError} onRetry={() => { form.reload().catch(() => undefined); }} />
      </Screen>
    );
  }

  const phoneDisplay = form.edit.phone ? formatInPhone(form.edit.phone) : '';

  return (
    <Screen scroll keyboard={mode === 'edit'} edges={['top', 'bottom']}>
      <AppHeader title={mode === 'view' ? 'Profile' : 'Edit profile'} />
      <View style={styles.body}>
        {mode === 'view' ? (
          <SavedSuccessBanner message="Profile saved · tap Edit to make changes" />
        ) : null}

        <View style={styles.avatarWrap}>
          <Pressable
            onPress={() => {
              if (mode === 'edit') changePhoto().catch(() => undefined);
            }}
            disabled={mode !== 'edit' || uploading}
            accessibilityRole="button">
            <View>
              <Avatar
                initials={initials}
                uri={displayPhoto}
                size={96}
                radius={48}
                bg={colors.inkGreen}
                fontSize={34}
              />
              {mode === 'edit' ? (
                <View style={styles.camBadge}>
                  {uploading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Icon name="camera" size={15} color={colors.white} strokeWidth={1.8} />
                  )}
                </View>
              ) : null}
            </View>
          </Pressable>
          {mode === 'edit' ? (
            <Pressable
              onPress={() => {
                changePhoto().catch(() => undefined);
              }}
              disabled={uploading}
              hitSlop={8}>
              <Text style={[styles.changePhoto, weight(700)]}>
                {uploading ? 'Uploading…' : 'Change photo'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {mode === 'view' ? (
          <>
            <ReadonlyField label="Full name" value={form.edit.name} />
            <ReadonlyField label="Date of birth" value={form.edit.dob} />
            {form.authContact.phoneLocked ? (
              <VerifiedContactField label="Phone number" value={phoneDisplay} />
            ) : (
              <ReadonlyField label="Phone number" value={phoneDisplay} />
            )}
            {form.authContact.emailLocked ? (
              <VerifiedContactField label="Email address" value={form.edit.email} />
            ) : (
              <ReadonlyField label="Email address" value={form.edit.email} />
            )}
            <ReadonlyField label="Gender" value={displayPickerGender(form.edit.gender)} />
            <PrimaryButton label="Edit profile" onPress={startEdit} />
          </>
        ) : (
          <>
            <TextField
              label="Full name"
              value={form.edit.name}
              onChangeText={t => form.setField('edit', 'name', t)}
              error={errs.name}
              maxLength={100}
            />
            <TextField
              label="Date of birth"
              value={form.edit.dob}
              onChangeText={t => form.setField('edit', 'dob', t)}
              placeholder="DD / MM / YYYY"
              keyboardType="numbers-and-punctuation"
              error={errs.dob}
              maxLength={14}
            />
            {form.authContact.phoneLocked ? (
              <VerifiedContactField label="Phone number" value={phoneDisplay} />
            ) : (
              <TextField
                label="Phone number"
                value={form.edit.phone}
                onChangeText={t => form.setField('edit', 'phone', digitsOnly(t, 10))}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="10-digit mobile number"
                error={errs.phone}
              />
            )}
            {form.authContact.emailLocked ? (
              <VerifiedContactField label="Email address" value={form.edit.email} />
            ) : (
              <TextField
                label="Email address"
                value={form.edit.email}
                onChangeText={t => form.setField('edit', 'email', t)}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errs.email}
              />
            )}
            <Text style={styles.label}>Gender</Text>
            <View style={styles.segment}>
              <SegmentedControl
                options={GENDER_OPTIONS}
                value={form.edit.gender}
                onChange={v => form.setField('edit', 'gender', v)}
              />
            </View>
            <PrimaryButton
              label={form.saving ? 'Saving…' : 'Save changes'}
              onPress={() => {
                save().catch(() => undefined);
              }}
              loading={form.saving}
              disabled={form.saving || uploading}
            />
            {form.hasEditData ? (
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
  body: { padding: 20, paddingTop: 22, paddingBottom: 28 },
  avatarWrap: { alignItems: 'center', marginBottom: 22 },
  camBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: { color: colors.primary, fontSize: 13, marginTop: 10 },
  label: { fontSize: 12, ...weight(600), color: colors.inkSecondary, marginBottom: 6 },
  segment: { marginBottom: 20 },
  cancel: { marginTop: 12 },
  skelAvatar: { width: 96, alignSelf: 'center', borderRadius: 48, marginBottom: 22 },
  skelRow: { marginBottom: 14, borderRadius: 12 },
});
