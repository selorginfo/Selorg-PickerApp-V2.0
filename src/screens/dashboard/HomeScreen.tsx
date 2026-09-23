import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MainTabScreenNavigation } from '../../navigation/navigationTypes';
import { Screen } from '../../components/common/Screen';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Avatar } from '../../components/common/Avatar';
import { Icon } from '../../components/icons/Icon';
import { ProgressBar } from '../../components/common/ProgressBar';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { colors, weight, mono, shadows } from '../../theme';
import { useShift } from '../../hooks/useShift';
import { useUI } from '../../hooks/useUI';
import { useStore } from '../../store/AppStore';
import { useApiResource } from '../../hooks/useApiResource';
import { homeApi } from '../../services/api/homeApi';
import { getCurrentCoords } from '../../services/location/locationService';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<MainTabScreenNavigation<'Home'>>();
  const shift = useShift();
  const { openCollectSheet } = useUI();
  const { state, dispatch } = useStore();
  const fetchHome = useCallback(async () => {
    const coords = await getCurrentCoords(8000).catch(() => null);
    return homeApi.getSummary(
      coords
        ? { lat: coords.latitude, lng: coords.longitude, accuracyM: coords.accuracyM }
        : undefined,
    );
  }, []);
  const { data: home, loading, error, refetch } = useApiResource(fetchHome);
  const shiftActiveRef = useRef(state.shift.active);
  shiftActiveRef.current = state.shift.active;

  useEffect(() => {
    if (!home) return;
    if (home.device?.collected && !state.onboarding.deviceCollected) {
      dispatch({ type: 'ob/setDeviceCollected', value: true });
    }
  }, [home, state.onboarding.deviceCollected, dispatch]);

  // Sync from home payload only (not when local start/checkout flips active),
  // so starting a shift isn't immediately undone by a stale summary.
  useEffect(() => {
    if (!home) return;
    if (home.shift?.active && !shiftActiveRef.current) {
      dispatch({ type: 'shift/startWork' });
    } else if (!home.shift?.active && shiftActiveRef.current) {
      dispatch({ type: 'shift/checkout' });
    }
  }, [home, dispatch]);

  const picker = home?.picker;
  const firstName = (picker?.name || '').trim().split(/\s+/)[0] || 'Picker';
  const initials = picker?.initials || 'SP';
  const roleLabel = picker ? `${picker.role || 'Picker'} · ID ${picker.id}` : 'Picker';
  const deviceCollected = Boolean(home?.device?.collected || state.onboarding.deviceCollected);

  useEffect(() => {
    if (state.onboarding.deviceCollected && home && !home.device?.collected) {
      refetch();
    }
  }, [state.onboarding.deviceCollected, home, refetch]);

  return (
    <Screen scroll contentStyle={styles.content} testID="screen-home">
      <OfflineBanner />
      <View style={styles.pad}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar initials={initials} />
            <View>
              <Text style={[styles.hi, weight(800)]} testID="home-greeting">
                Hi, {firstName}
              </Text>
              <Text style={styles.role}>{roleLabel}</Text>
            </View>
          </View>
          <Pressable
            style={styles.bell}
            onPress={() => navigation.navigate('Notifications')}
            testID="home-notifications"
            accessibilityLabel="Notifications">
            <Icon name="bell" size={21} color={colors.ink} strokeWidth={1.8} />
            {(home?.unreadNotifications ?? 0) > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>

        {loading && !home && (
          <>
            <Skeleton height={150} style={styles.mb14} />
            <Skeleton height={78} style={styles.mb14} />
            <Skeleton height={96} style={styles.mb14} />
            <View style={styles.row12}>
              <Skeleton height={120} width="48%" />
              <Skeleton height={120} width="48%" />
            </View>
          </>
        )}

        {error && !home && (
          <ErrorState message={error || 'Check your connection and try again.'} onRetry={refetch} />
        )}

        {home && (
          <>
            {!deviceCollected && (
              <Pressable style={styles.collectCard} onPress={openCollectSheet}>
                <View style={styles.collectIcon}>
                  <Icon name="phoneDevice" size={24} color={colors.amberText2} strokeWidth={1.8} />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.collectTitle, weight(800)]}>Collect your device</Text>
                  <Text style={styles.collectSub}>
                    {home.device?.copy || 'Enter the manager OTP to receive your HHD'}
                  </Text>
                </View>
                <Icon name="chevronRight" size={20} color="#B07A00" strokeWidth={2} />
              </Pressable>
            )}

            <View style={styles.hubCard}>
              <View style={styles.hubHeader}>
                <View style={styles.hubTitleRow}>
                  <Text style={[styles.hubName, weight(800)]}>{home.hub?.name || 'Hub'}</Text>
                  {shift.active && (
                    <View style={styles.livePill}>
                      <View style={styles.liveDot} />
                      <Text style={[styles.liveText, weight(800)]}>LIVE</Text>
                    </View>
                  )}
                </View>
                <Icon name="pin" size={19} color={colors.inkMuted2} strokeWidth={2} />
              </View>
              <Text style={styles.hubAddress}>{home.hub?.address || '—'}</Text>
              <View style={styles.hubStats}>
                <View style={styles.flex1}>
                  <Text style={styles.statLabel}>Accuracy</Text>
                  <Text style={[styles.statValue, weight(700)]}>{home.hub?.accuracy || '—'}</Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.statLabel}>Status</Text>
                  <Text style={[styles.statValue, weight(700), { color: colors.primary }]}>
                    {home.hub?.onSite ? 'On site ✓' : 'Off site'}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />

              {shift.active ? (
                <>
                  <View style={styles.activeRow}>
                    <View style={styles.activeLeft}>
                      <View style={styles.activeDot} />
                      <Text style={[styles.activeLabel, weight(800)]}>Shift Active</Text>
                    </View>
                    <Text style={[styles.timerPill, mono(15, 700)]}>{shift.timer}</Text>
                  </View>
                  <PrimaryButton
                    label="CHECK OUT"
                    onPress={shift.checkout}
                    loading={shift.busy}
                    disabled={shift.busy}
                    danger
                    height={52}
                    fontSize={15}
                    testID="checkout-shift"
                  />
                  <View style={styles.hubFooter}>
                    <Text style={styles.hubFooterText}>Stay on site · checkout when your shift ends</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inactiveRow}>
                    <View style={styles.activeLeft}>
                      <View style={styles.clockChip}>
                        <Icon name="clock" size={18} color={colors.primary} strokeWidth={2} />
                      </View>
                      <Text style={[styles.todayShift, weight(700)]}>Today's Shift</Text>
                    </View>
                    <Text style={[styles.shiftWindow, weight(800)]}>{home.shift?.window || '—'}</Text>
                  </View>
                  <PrimaryButton
                    label="START MY SHIFT"
                    onPress={shift.startShift}
                    loading={shift.busy}
                    disabled={shift.busy}
                    height={52}
                    fontSize={15}
                    testID="start-shift"
                  />
                  <View style={styles.hubFooter}>
                    <Text style={styles.hubFooterText}>Face or fingerprint required · on-site only</Text>
                  </View>
                </>
              )}
            </View>

            <Pressable style={styles.balanceCard} onPress={() => navigation.navigate('Payouts')}>
              <View style={styles.balanceTop}>
                <View style={styles.balanceLeft}>
                  <View style={styles.balanceIcon}>
                    <Icon name="wallet" size={22} color={colors.white} strokeWidth={1.8} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={[styles.balanceAmount, mono(24)]}>{home.balance?.available || '₹0'}</Text>
                  </View>
                </View>
                <Icon name="chevronRight" size={22} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              </View>
              <View style={styles.balanceFooter}>
                <Text style={styles.balancePending}>{home.balance?.pending || '₹0 pending'}</Text>
                <Text style={[styles.balanceCta, weight(700)]}>View payouts</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.ordersCard}
              onPress={() => navigation.navigate('AssignedWork')}
              testID="home-assigned-work"
              accessibilityLabel="Assigned work">
              <View style={styles.ordersIcon}>
                <Icon name="package" size={26} color={colors.teal} strokeWidth={1.8} />
              </View>
              <View style={styles.flex1}>
                <View style={styles.ordersTop}>
                  <Text style={[styles.ordersCount, weight(800)]}>{home.orders?.count ?? 0}</Text>
                  <Text style={styles.ordersUnit}>orders</Text>
                  <Text style={[styles.ordersPending, weight(800)]}>{home.orders?.pending ?? 0} pending</Text>
                </View>
                <Text style={styles.ordersSync}>
                  {home.orders?.syncedLabel || 'Orders synced from HHD'} · tap for status
                </Text>
                <ProgressBar pct={home.orders?.progress ?? 0} color={colors.teal} />
              </View>
              <Icon name="chevronRight" size={20} color={colors.inkMuted2} strokeWidth={2} />
            </Pressable>

            <View style={styles.row12}>
              <View style={styles.metricTile}>
                <View style={[styles.metricIcon, { backgroundColor: colors.amberBg }]}>
                  <Icon name="dollar" size={22} color={colors.amber} strokeWidth={1.8} />
                </View>
                <Text style={[styles.metricValue, mono(24)]}>{home.metrics?.todaysEarnings || '₹0'}</Text>
                <Text style={styles.metricLabel}>Today's Earnings</Text>
              </View>
              <View style={styles.metricTile}>
                <View style={[styles.metricIcon, { backgroundColor: colors.primary }]}>
                  <Icon name="zap" size={22} color={colors.white} />
                </View>
                <Text style={[styles.metricValue, mono(24)]}>{home.metrics?.incentivesToday || '₹0'}</Text>
                <Text style={styles.metricLabel}>Incentives Today</Text>
              </View>
            </View>

            <View style={styles.perfCard}>
              <View style={styles.perfHeader}>
                <Text style={[styles.perfTitle, weight(800)]}>Performance Metrics</Text>
                <Text style={[styles.perfPill, weight(800)]}>{home.performance?.rank || '—'}</Text>
              </View>
              <View style={styles.perfRow}>
                <Text style={styles.perfLabel}>Accuracy</Text>
                <Text style={[styles.perfValue, weight(800)]}>{home.performance?.accuracy ?? 0}%</Text>
              </View>
              <ProgressBar pct={home.performance?.accuracy ?? 0} color={colors.primary} />
              <View style={[styles.perfRow, styles.mt16]}>
                <Text style={styles.perfLabel}>Speed</Text>
                <Text style={[styles.perfValue, weight(800)]}>{home.performance?.speedLabel || '0 items/hr'}</Text>
              </View>
              <ProgressBar pct={home.performance?.speedPct ?? 0} color={colors.amber} />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  pad: { padding: 16 },
  mb14: { marginBottom: 14 },
  mt16: { marginTop: 16 },
  row12: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  flex1: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  hi: { fontSize: 17 },
  role: { fontSize: 12, color: colors.inkSecondary, ...weight(600) },
  bell: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface },

  collectCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberBorder, borderRadius: 18, padding: 16, marginBottom: 14 },
  collectIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#F6E4B8', alignItems: 'center', justifyContent: 'center' },
  collectTitle: { fontSize: 14.5, color: '#7A5600' },
  collectSub: { fontSize: 12, color: colors.amberText },

  hubCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, marginBottom: 14, ...shadows.card },
  hubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  hubTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  hubName: { fontSize: 18 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoftBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  liveText: { fontSize: 10.5, color: colors.primary },
  hubAddress: { fontSize: 13, color: colors.inkSecondary, marginBottom: 14 },
  hubStats: { flexDirection: 'row', gap: 20, marginBottom: 14 },
  statLabel: { fontSize: 11.5, color: colors.inkMuted, ...weight(600) },
  statValue: { fontSize: 14, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginBottom: 12 },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primarySoftBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  activeLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  activeDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  activeLabel: { fontSize: 15, color: colors.primary },
  timerPill: { color: colors.primaryDark, backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' },
  inactiveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clockChip: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.neutralGreenBg, alignItems: 'center', justifyContent: 'center' },
  todayShift: { fontSize: 14 },
  shiftWindow: { fontSize: 14, color: colors.primary },
  hubFooter: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  hubFooterText: { fontSize: 12, color: colors.inkMuted, textAlign: 'center', ...weight(600) },

  balanceCard: { backgroundColor: colors.inkGreen, borderRadius: 18, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, marginBottom: 14 },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  balanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 13, flex: 1 },
  balanceIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)', ...weight(600) },
  balanceAmount: { color: colors.gold },
  balanceFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 10 },
  balancePending: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  balanceCta: { fontSize: 12.5, color: colors.gold },

  ordersCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, marginBottom: 14, ...shadows.card },
  ordersIcon: { width: 54, height: 54, borderRadius: 14, backgroundColor: colors.tealBg, alignItems: 'center', justifyContent: 'center' },
  ordersTop: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  ordersCount: { fontSize: 30 },
  ordersUnit: { fontSize: 14, color: colors.inkSecondary, ...weight(600) },
  ordersPending: { marginLeft: 'auto', fontSize: 13, color: colors.amber },
  ordersSync: { fontSize: 12, color: colors.inkSecondary, marginVertical: 4 },

  metricTile: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, ...shadows.card },
  metricIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  metricValue: {},
  metricLabel: { fontSize: 12, color: colors.inkSecondary, ...weight(600) },

  perfCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18, ...shadows.card },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  perfTitle: { fontSize: 16 },
  perfPill: { backgroundColor: colors.primarySoftBg, color: colors.primary, fontSize: 11.5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  perfRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  perfLabel: { fontSize: 13.5, color: colors.inkSecondary, ...weight(600) },
  perfValue: { fontSize: 14 },
});
