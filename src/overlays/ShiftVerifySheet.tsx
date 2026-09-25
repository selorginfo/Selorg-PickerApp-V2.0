import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/bottomSheets/BottomSheet';
import { Icon } from '../components/icons/Icon';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { FaceScanCamera } from '../components/auth/FaceScanCamera';
import { FingerprintScanPanel } from '../components/auth/FingerprintScanPanel';
import { colors, weight } from '../theme';
import { useShift } from '../hooks/useShift';
import { config } from '../constants/config';
import { onboardingApi } from '../services/api/onboardingApi';
import { profileApi } from '../services/api/profileApi';
import { ApiError } from '../services/api/client';
import { pickProfilePhoto } from '../services/media/pickDocumentImage';
import { useStore } from '../store/AppStore';

export const ShiftVerifySheet: React.FC = () => {
  const shift = useShift();
  const { dispatch } = useStore();
  const visible = shift.step !== 'none';
  const { setStep } = shift;
  const [busy, setBusy] = useState(false);

  const completeFace = useCallback(async () => {
    if (busy) return;
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
        source: 'shift_start',
      });
      setStep('success');
    } catch (e) {
      dispatch({
        type: 'ui/setToast',
        value: e instanceof ApiError ? e.message : 'Face verification failed',
      });
    } finally {
      setBusy(false);
    }
  }, [busy, dispatch, setStep]);

  /** Device biometric already confirmed locally — no fake face API call. */
  const completeFingerprint = useCallback(() => {
    setStep('success');
  }, [setStep]);

  return (
    <BottomSheet visible={visible} onClose={shift.closeSheet} dismissable={shift.step !== 'face' && shift.step !== 'fingerprint'}>
      {shift.step === 'location' && (
        <View style={styles.center}>
          <View style={styles.iconBox}>
            <Icon name="pin" size={38} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={[styles.h1, weight(800)]}>Verify your location</Text>
          <Text style={styles.copy}>
            Checking you're within{' '}
            <Text style={weight(700)}>{shift.lastReadiness?.geofenceM ?? config.geofenceMeters} m</Text> of{' '}
            {shift.lastReadiness?.hub || 'your hub'}.
          </Text>
          <View style={styles.locPill}>
            <View style={styles.locDot} />
            <Text style={[styles.locText, weight(700)]}>
              You're on site
              {shift.lastReadiness?.accuracyM
                ? ` · ±${Math.round(shift.lastReadiness.accuracyM)} m accuracy`
                : shift.lastReadiness?.distanceM != null
                  ? ` · ${Math.round(shift.lastReadiness.distanceM)} m away`
                  : ''}
            </Text>
          </View>
          <PrimaryButton label="Location verified · Continue" onPress={() => shift.setStep('identity')} height={52} fontSize={15} />
          <Pressable style={styles.cancel} onPress={shift.closeSheet}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {shift.step === 'identity' && (
        <View style={styles.identityBody}>
          <Text style={[styles.h1, styles.tc, weight(800)]}>Verify your identity</Text>
          <Text style={[styles.copy, styles.tc]}>Choose a method to confirm it's you</Text>
          <Pressable style={styles.methodRow} onPress={() => shift.setStep('face')}>
            <View style={styles.methodIcon}>
              <Icon name="face" size={24} color={colors.primary} strokeWidth={1.8} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.methodTitle, weight(800)]}>Face verification</Text>
              <Text style={styles.methodSub}>Recommended · live camera</Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.inkMuted2} strokeWidth={2} />
          </Pressable>
          <Pressable style={[styles.methodRow, styles.methodRowLast]} onPress={() => shift.setStep('fingerprint')}>
            <View style={styles.methodIcon}>
              <Icon name="fingerprint" size={24} color={colors.primary} strokeWidth={1.8} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.methodTitle, weight(800)]}>Fingerprint</Text>
              <Text style={styles.methodSub}>Use device biometrics</Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.inkMuted2} strokeWidth={2} />
          </Pressable>
        </View>
      )}

      {shift.step === 'face' && (
        <View style={styles.authBody}>
          <FaceScanCamera
            active={shift.step === 'face' && !busy}
            onVerified={() => {
              completeFace().catch(() => undefined);
            }}
          />
          {busy ? <Text style={styles.busyHint}>Uploading & verifying…</Text> : null}
          <Pressable style={styles.cancel} onPress={() => shift.setStep('identity')} disabled={busy}>
            <Text style={styles.cancelText}>Choose another method</Text>
          </Pressable>
        </View>
      )}

      {shift.step === 'fingerprint' && (
        <View style={styles.authBody}>
          <FingerprintScanPanel
            active={shift.step === 'fingerprint'}
            onVerified={completeFingerprint}
            onBack={() => shift.setStep('identity')}
          />
        </View>
      )}

      {shift.step === 'success' && (
        <View style={styles.center}>
          <View style={styles.successCircle}>
            <Icon name="check" size={46} color={colors.primary} strokeWidth={2.4} />
          </View>
          <Text style={[styles.h1, weight(800)]}>Verified</Text>
          <Text style={styles.copy}>Location confirmed at your hub. Ready to start your shift.</Text>
          <PrimaryButton
            label="Start work"
            onPress={shift.startWork}
            loading={shift.busy}
            disabled={shift.busy}
            height={52}
            fontSize={15}
            testID="start-work"
          />
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  identityBody: { width: '100%' },
  authBody: { width: '100%' },
  flex1: { flex: 1 },
  tc: { textAlign: 'center' },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: colors.primarySoftBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  h1: { fontSize: 20, marginBottom: 8 },
  copy: {
    fontSize: 13.5,
    color: colors.inkSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  locPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoftBg,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 11,
    marginBottom: 22,
  },
  locDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  locText: { color: colors.primary, fontSize: 13 },
  cancel: { paddingVertical: 12, marginTop: 6 },
  cancelText: { color: colors.inkMuted, fontSize: 13.5, textAlign: 'center', ...weight(600) },
  busyHint: {
    textAlign: 'center',
    color: colors.inkSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.neutralGreenBg3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  methodRowLast: { marginBottom: 4 },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.primarySoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: { fontSize: 15 },
  methodSub: { fontSize: 12.5, color: colors.inkSecondary },
  successCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primarySoftBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
});
