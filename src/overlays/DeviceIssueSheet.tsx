import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { BottomSheet } from '../components/bottomSheets/BottomSheet';
import { RadioCard } from '../components/inputs/RadioCard';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { colors, weight } from '../theme';
import { useUI } from '../hooks/useUI';
import { profileApi } from '../services/api/profileApi';
import { ApiError } from '../services/api/client';
import { deviceIssueReasons } from '../mock/device';

export const DeviceIssueSheet: React.FC = () => {
  const ui = useUI();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState('your HHD');

  useEffect(() => {
    if (!ui.deviceSheet) return;
    let cancelled = false;
    profileApi
      .getDevice()
      .then(res => {
        if (cancelled) return;
        const id = res?.device?.id;
        setDeviceLabel(id || 'your HHD');
      })
      .catch(() => {
        if (!cancelled) setDeviceLabel('your HHD');
      });
    return () => {
      cancelled = true;
    };
  }, [ui.deviceSheet]);

  const submit = async () => {
    if (busyRef.current) return;
    if (!ui.deviceReason) {
      ui.toast('Select an issue first');
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      await profileApi.reportDeviceIssue({ reason: ui.deviceReason });
      ui.closeDeviceSheet();
      ui.toast('Issue reported · support will call you');
    } catch (e) {
      ui.toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed to report issue');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={ui.deviceSheet} onClose={busy ? () => undefined : ui.closeDeviceSheet}>
      <Text style={[styles.title, weight(800)]}>Report a device issue</Text>
      <Text style={styles.sub} testID="device-issue-sub">
        Pick what's wrong with {deviceLabel}
      </Text>
      {deviceIssueReasons.map(r => (
        <RadioCard
          key={r}
          title={r}
          selected={ui.deviceReason === r}
          onPress={() => {
            if (!busy) ui.setDeviceReason(r);
          }}
          compact
        />
      ))}
      <PrimaryButton
        label="Submit report"
        onPress={submit}
        loading={busy}
        disabled={busy}
        height={54}
        fontSize={15}
        style={styles.submit}
        testID="device-issue-submit"
      />
      <Pressable style={styles.cancel} onPress={ui.closeDeviceSheet} disabled={busy} testID="device-issue-cancel">
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 19, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.inkSecondary, marginBottom: 20 },
  submit: { marginTop: 8 },
  cancel: { paddingVertical: 12, marginTop: 4, alignItems: 'center' },
  cancelText: { color: colors.inkMuted, fontSize: 13.5, ...weight(600) },
});
