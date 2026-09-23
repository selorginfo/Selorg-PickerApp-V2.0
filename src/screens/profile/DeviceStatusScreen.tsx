import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { Icon } from '../../components/icons/Icon';
import { ProgressBar } from '../../components/common/ProgressBar';
import { KeyValueRow } from '../../components/lists/KeyValueRow';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { OutlineButton } from '../../components/buttons/OutlineButton';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { colors, weight, shadows } from '../../theme';
import { useUI } from '../../hooks/useUI';
import { useApiResource } from '../../hooks/useApiResource';
import { profileApi } from '../../services/api/profileApi';

export const DeviceStatusScreen: React.FC = () => {
  const { openDeviceSheet, toast } = useUI();
  const { data, loading, error, refetch } = useApiResource(() => profileApi.getDevice());
  const device = data?.device ?? null;
  const rows = data?.rows ?? [];
  const battery = device?.battery ?? 0;

  return (
    <Screen scroll edges={['top']}>
      <AppHeader title="Device status" />
      <View style={styles.body}>
        {loading && !data && (
          <>
            <Skeleton height={160} style={styles.mb16} />
            <Skeleton height={120} />
          </>
        )}

        {error && !data && (
          <ErrorState
            title="Couldn't load device"
            message={
              /401|unauthor|session|token/i.test(String(error))
                ? 'Session expired or device API unavailable. Go back and try again.'
                : undefined
            }
            onRetry={refetch}
          />
        )}

        {data && !device && (
          <EmptyState icon="phoneDevice" title="No device assigned" subtitle="Collect your HHD from the hub to see status here" />
        )}

        {device && (
          <>
            <View style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View style={styles.deviceIcon}>
                  <Icon name="phoneDevice" size={26} color={colors.white} strokeWidth={1.8} />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.deviceId, weight(800)]}>{device.id}</Text>
                  <Text style={styles.deviceModel}>{device.model}</Text>
                </View>
                <View style={styles.activePill}>
                  <View style={styles.activeDot} />
                  <Text style={[styles.activeText, weight(800)]}>{device.status || 'Active'}</Text>
                </View>
              </View>
              {device.battery != null && (
                <>
                  <View style={styles.batteryRow}>
                    <Text style={styles.batteryLabel}>Battery</Text>
                    <Text style={[styles.batteryPct, weight(800)]}>{battery}%</Text>
                  </View>
                  <ProgressBar pct={battery} color={colors.mint} track="rgba(255,255,255,0.15)" />
                </>
              )}
            </View>

            <View style={styles.card}>
              {rows.map((r, i) => (
                <KeyValueRow key={`${r.k}-${i}`} label={r.k} value={r.v} last={i === rows.length - 1 && !device.lastSynced} />
              ))}
              {device.lastSynced ? (
                <KeyValueRow label="Last synced" value={device.lastSynced} valueColor={colors.primary} last />
              ) : null}
            </View>

            <PrimaryButton label="Report an issue" onPress={openDeviceSheet} height={54} fontSize={15} style={styles.reportBtn} />
            <OutlineButton
              label="Request replacement"
              onPress={async () => {
                try {
                  await profileApi.reportDeviceIssue({ reason: 'Request replacement' });
                  toast('Replacement requested');
                  refetch();
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Could not request replacement');
                }
              }}
            />
            <OutlineButton
              label="Return device"
              onPress={async () => {
                try {
                  await profileApi.returnDevice();
                  toast('Device returned');
                  refetch();
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Could not return device');
                }
              }}
              style={styles.returnBtn}
            />
          </>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 28 },
  mb16: { marginBottom: 16 },
  flex1: { flex: 1 },
  deviceCard: { backgroundColor: colors.inkGreen, borderRadius: 20, padding: 20, marginBottom: 16 },
  deviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 18 },
  deviceIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  deviceId: { fontSize: 18, color: colors.white },
  deviceModel: { fontSize: 12.5, color: 'rgba(255,255,255,0.75)' },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(140,224,163,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint },
  activeText: { fontSize: 11, color: colors.mint },
  batteryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  batteryLabel: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
  batteryPct: { fontSize: 13, color: colors.white },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 6, marginBottom: 16, ...shadows.card },
  reportBtn: { marginBottom: 10 },
  returnBtn: { marginTop: 10 },
});
