import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, weight, shadows } from '../../../theme';
import { TextField } from '../../../components/inputs/TextField';
import { OutlineButton } from '../../../components/buttons/OutlineButton';
import { useOnboarding } from '../../../hooks/useOnboarding';
import { useStore } from '../../../store/AppStore';
import { digitsOnly } from '../../../utils/validators';
import { pickDocumentImage } from '../../../services/media/pickDocumentImage';
import { toDataUri } from '../../../services/media/ensureImageBase64';
import { onboardingApi } from '../../../services/api/onboardingApi';
import { ApiError } from '../../../services/api/client';

type KycDocKind = 'aadhaar' | 'pan';

export const Step6Kyc: React.FC = () => {
  const ob = useOnboarding();
  const { dispatch } = useStore();
  const errs = ob.errorsFor('obKyc');
  const [busy, setBusy] = useState<KycDocKind | null>(null);

  const uploadCard = useCallback(
    async (kind: KycDocKind) => {
      if (busy) return;
      const picked = await pickDocumentImage(
        kind === 'aadhaar' ? 'Upload Aadhaar card' : 'Upload PAN card',
      );
      if (!picked?.uri || !picked.base64) return;

      setBusy(kind);
      try {
        const uploaded = await onboardingApi.uploadKycCard({
          base64: picked.base64,
          ocrType: kind,
          fileName: picked.fileName,
          mimeType: picked.mimeType,
          uri: picked.uri,
        });

        const previewUrl =
          uploaded.url ||
          (uploaded.base64 ? toDataUri(uploaded.base64, uploaded.mimeType || picked.mimeType) : '') ||
          toDataUri(picked.base64, picked.mimeType);

        if (kind === 'aadhaar') {
          dispatch({ type: 'ob/setField', section: 'obKyc', key: 'aadhaarUrl', value: previewUrl });
          if (uploaded.fileName || picked.fileName) {
            dispatch({
              type: 'ob/setField',
              section: 'obKyc',
              key: 'aadhaarFileName',
              value: uploaded.fileName || picked.fileName,
            });
          }
          const detected = String(uploaded.ocrNumber || '').replace(/\D/g, '').slice(0, 12);
          if (detected.length === 12) {
            dispatch({ type: 'ob/setField', section: 'obKyc', key: 'aadhaar', value: detected });
            dispatch({ type: 'ui/setToast', value: 'Aadhaar uploaded' });
          } else {
            dispatch({
              type: 'ui/setToast',
              value: 'Aadhaar uploaded — enter the number if not detected',
            });
          }
        } else {
          dispatch({ type: 'ob/setField', section: 'obKyc', key: 'panUrl', value: previewUrl });
          if (uploaded.fileName || picked.fileName) {
            dispatch({
              type: 'ob/setField',
              section: 'obKyc',
              key: 'panFileName',
              value: uploaded.fileName || picked.fileName,
            });
          }
          const detected = String(uploaded.ocrNumber || '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 10);
          if (/^[A-Z]{5}\d{4}[A-Z]$/.test(detected)) {
            dispatch({ type: 'ob/setField', section: 'obKyc', key: 'pan', value: detected });
            dispatch({ type: 'ui/setToast', value: 'PAN uploaded' });
          } else {
            dispatch({
              type: 'ui/setToast',
              value: 'PAN uploaded — enter the number if not detected',
            });
          }
        }
      } catch (e) {
        dispatch({
          type: 'ui/setToast',
          value: e instanceof ApiError ? e.message : 'Could not upload document',
        });
      } finally {
        setBusy(null);
      }
    },
    [busy, dispatch],
  );

  return (
    <View style={styles.card}>
      <Text style={[styles.title, weight(800)]}>Identity &amp; KYC</Text>
      <Text style={styles.sub}>Aadhaar and PAN are used for verification only.</Text>

      <TextField
        label="Aadhaar number"
        value={ob.kyc.aadhaar}
        onChangeText={t => ob.setField('obKyc', 'aadhaar', digitsOnly(t, 12))}
        keyboardType="number-pad"
        maxLength={12}
        placeholder="12-digit number"
        error={errs.aadhaar}
      />
      <View style={styles.uploadWrap}>
        {busy === 'aadhaar' ? (
          <View style={styles.uploading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.uploadingText, weight(600)]}>Uploading Aadhaar…</Text>
          </View>
        ) : ob.kyc.aadhaarUrl ? (
          <Pressable
            style={styles.previewCard}
            onPress={() => void uploadCard('aadhaar')}
            testID="ob-kyc-upload-aadhaar">
            <Image source={{ uri: ob.kyc.aadhaarUrl }} style={styles.previewImage} resizeMode="cover" />
            <Text style={[styles.previewHint, weight(600)]}>Aadhaar uploaded · tap to replace</Text>
          </Pressable>
        ) : (
          <OutlineButton
            label="Upload Aadhaar card"
            icon="upload"
            dashed
            color={colors.primary}
            height={54}
            onPress={() => void uploadCard('aadhaar')}
            testID="ob-kyc-upload-aadhaar"
          />
        )}
      </View>

      <TextField
        label="PAN number"
        value={ob.kyc.pan}
        onChangeText={t =>
          ob.setField('obKyc', 'pan', t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10))
        }
        maxLength={10}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ABCDE1234F"
        error={errs.pan}
      />
      <View style={styles.uploadWrap}>
        {busy === 'pan' ? (
          <View style={styles.uploading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.uploadingText, weight(600)]}>Uploading PAN…</Text>
          </View>
        ) : ob.kyc.panUrl ? (
          <Pressable
            style={styles.previewCard}
            onPress={() => void uploadCard('pan')}
            testID="ob-kyc-upload-pan">
            <Image source={{ uri: ob.kyc.panUrl }} style={styles.previewImage} resizeMode="cover" />
            <Text style={[styles.previewHint, weight(600)]}>PAN uploaded · tap to replace</Text>
          </Pressable>
        ) : (
          <OutlineButton
            label="Upload PAN card"
            icon="upload"
            dashed
            color={colors.primary}
            height={54}
            onPress={() => void uploadCard('pan')}
            testID="ob-kyc-upload-pan"
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 20,
    ...shadows.card,
  },
  title: { fontSize: 15, marginBottom: 2 },
  sub: { fontSize: 12.5, color: colors.inkSecondary, marginBottom: 18, lineHeight: 19 },
  uploadWrap: { marginTop: 10, marginBottom: 14 },
  uploading: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9AC7A6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surface,
  },
  uploadingText: { fontSize: 13, color: colors.primary },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#9AC7A6',
    overflow: 'hidden',
    backgroundColor: colors.primarySoftBg,
  },
  previewImage: { width: '100%', height: 160, backgroundColor: '#E8F0EA' },
  previewHint: {
    fontSize: 12.5,
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
