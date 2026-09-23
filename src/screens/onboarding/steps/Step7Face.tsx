import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, weight, shadows } from '../../../theme';
import { Icon } from '../../../components/icons/Icon';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { useOnboarding } from '../../../hooks/useOnboarding';
import { onboardingApi } from '../../../services/api/onboardingApi';
import { profileApi } from '../../../services/api/profileApi';
import { ApiError } from '../../../services/api/client';
import { useStore } from '../../../store/AppStore';
import { useLayout } from '../../../hooks/useLayout';
import { pickProfilePhoto } from '../../../services/media/pickDocumentImage';

export const Step7Face: React.FC = () => {
  const ob = useOnboarding();
  const { dispatch } = useStore();
  const { cappedSize } = useLayout();
  const size = cappedSize(150, 0.4);
  const iconSize = Math.round(size * 0.42);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  const capture = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const photo = await pickProfilePhoto();
      if (!photo?.uri) {
        dispatch({ type: 'ui/setToast', value: 'Capture a face photo to continue' });
        return;
      }

      const uploaded = await profileApi.uploadFace(photo.uri, {
        fileName: photo.fileName,
        mimeType: photo.mimeType,
      });
      if (!uploaded?.url) {
        throw new Error('Face upload did not return a URL');
      }

      await onboardingApi.verifyFace({
        imageUrl: uploaded.url,
        source: 'onboarding',
      });
      ob.setFaceDone(true);
    } catch (e) {
      dispatch({
        type: 'ui/setToast',
        value: e instanceof ApiError ? e.message : 'Face verification failed',
      });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={[styles.title, weight(800)]}>Face verification</Text>
      <Text style={styles.sub}>
        Capture a clear front-facing photo. This confirms your identity for shifts.
      </Text>

      {ob.faceDone ? (
        <>
          <View style={[styles.circleDone, { width: size, height: size, borderRadius: size / 2 }]}>
            <Icon name="check" size={iconSize} color={colors.primary} strokeWidth={2.4} />
          </View>
          <Text style={[styles.verified, weight(800)]}>Face verified</Text>
        </>
      ) : (
        <>
          <View style={[styles.circleReady, { width: size, height: size, borderRadius: size / 2 }]}>
            <Icon name="face" size={iconSize} color={colors.primary} />
          </View>
          <PrimaryButton
            label={busy ? 'Verifying…' : 'Capture & verify'}
            onPress={() => {
              void capture();
            }}
            height={50}
            fontSize={14}
            disabled={busy}
            style={styles.cta}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    ...shadows.card,
  },
  title: { fontSize: 15, marginBottom: 6 },
  sub: {
    fontSize: 12.5,
    color: colors.inkSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  circleDone: {
    backgroundColor: colors.primarySoftBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  circleReady: {
    backgroundColor: colors.primarySoftBg,
    borderWidth: 2,
    borderColor: '#9AC7A6',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  cta: { alignSelf: 'stretch' },
  verified: { fontSize: 14, color: colors.primary },
});
