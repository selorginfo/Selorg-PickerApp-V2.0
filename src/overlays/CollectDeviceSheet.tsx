import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../components/bottomSheets/BottomSheet';
import { Icon } from '../components/icons/Icon';
import { Checkbox } from '../components/inputs/Checkbox';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { colors, weight, fontFamily } from '../theme';
import { useUI } from '../hooks/useUI';
import { useOnboarding } from '../hooks/useOnboarding';
import { profileApi } from '../services/api/profileApi';

export const CollectDeviceSheet: React.FC = () => {
  const { collectSheet, closeCollectSheet } = useUI();
  const ob = useOnboarding();
  const otpOk = /^\d{4}$/.test(ob.mgrOtp);
  const canConfirm = ob.mgrSent && otpOk && ob.deviceAck && !ob.collectBusy;
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceModel, setDeviceModel] = useState<string | null>(null);

  useEffect(() => {
    if (!collectSheet) return;
    let cancelled = false;
    profileApi
      .getDevice()
      .then(res => {
        if (cancelled) return;
        setDeviceId(res?.device?.id || null);
        setDeviceModel(res?.device?.model || null);
      })
      .catch(() => {
        if (!cancelled) {
          setDeviceId(null);
          setDeviceModel(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [collectSheet]);

  const label = deviceId || 'Assigned HHD';
  const modelLine = deviceModel || (deviceId ? 'Handheld device' : 'Collect from your hub manager');

  return (
    <BottomSheet visible={collectSheet} onClose={closeCollectSheet}>
      <Text style={[styles.title, weight(800)]}>Collect your device</Text>
      <Text style={styles.sub}>
        Ask your hub manager for a collection OTP, then confirm handover
        {deviceId ? ` of ${deviceId}` : ' of your assigned HHD'}.
      </Text>

      <View style={styles.deviceCard}>
        <View style={styles.deviceIcon}>
          <Icon name="phoneDevice" size={24} color={colors.white} strokeWidth={1.8} />
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.deviceId, weight(800)]} testID="collect-device-id">
            {label}
          </Text>
          <Text style={styles.deviceSub}>{modelLine}</Text>
        </View>
      </View>

      {ob.mgrSent ? (
        <>
          <Text style={styles.label}>Manager OTP</Text>
          <TextInput
            style={[styles.otpInput, ob.mgrSent && !otpOk && ob.mgrOtp.length > 0 ? styles.otpError : null]}
            value={ob.mgrOtp}
            onChangeText={ob.setMgrOtp}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="4-digit code"
            placeholderTextColor={colors.inkMuted}
            editable={!ob.collectBusy}
            testID="collect-manager-otp"
          />
          {ob.mgrOtp.length > 0 && !otpOk ? (
            <Text style={styles.fieldError}>Enter the 4-digit manager OTP</Text>
          ) : null}
        </>
      ) : (
        <Pressable
          style={styles.requestBtn}
          onPress={ob.requestMgrOtp}
          disabled={ob.collectBusy}
          testID="collect-request-otp">
          <Text style={[styles.requestLabel, weight(700)]}>Request collection OTP</Text>
        </Pressable>
      )}

      <Pressable style={styles.ackRow} onPress={ob.toggleDeviceAck} disabled={ob.collectBusy}>
        <Checkbox checked={ob.deviceAck} onToggle={ob.toggleDeviceAck} size={24} radius={7} />
        <Text style={[styles.ackText, weight(700)]}>
          I've received {deviceId || 'my HHD'} in working condition
        </Text>
      </Pressable>

      <PrimaryButton
        label={ob.collectBusy ? 'Confirming…' : 'Confirm collection'}
        onPress={() => {
          ob.confirmCollect().catch(() => undefined);
        }}
        height={54}
        fontSize={15}
        disabled={!canConfirm}
        loading={ob.collectBusy}
        testID="collect-confirm"
      />
      <Pressable style={styles.cancel} onPress={closeCollectSheet} disabled={ob.collectBusy}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 19, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.inkSecondary, marginBottom: 18 },
  flex1: { flex: 1 },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.inkGreen,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  deviceIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceId: { fontSize: 16, color: colors.white },
  deviceSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  label: { fontSize: 12, ...weight(600), color: colors.inkSecondary, marginBottom: 6 },
  otpInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 6,
    color: colors.ink,
    fontFamily: fontFamily.mono,
    marginBottom: 6,
  },
  otpError: { borderColor: colors.inputBorderError },
  fieldError: { fontSize: 11.5, color: colors.danger, marginBottom: 10, ...weight(600) },
  requestBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  requestLabel: { color: colors.primary, fontSize: 14 },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 15,
    marginBottom: 16,
  },
  ackText: { flex: 1, fontSize: 13.5, color: colors.ink },
  cancel: { paddingVertical: 12, marginTop: 4, alignItems: 'center' },
  cancelText: { color: colors.inkMuted, fontSize: 13.5, ...weight(600) },
});
