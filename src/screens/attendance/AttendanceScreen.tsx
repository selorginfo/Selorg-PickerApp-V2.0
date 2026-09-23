import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { ProgressRing } from '../../components/common/ProgressRing';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Skeleton } from '../../components/feedback/Skeleton';
import { KeyValueRow } from '../../components/lists/KeyValueRow';
import { Icon } from '../../components/icons/Icon';
import { colors, weight, mono, shadows } from '../../theme';
import { useAttendance } from '../../hooks/useAttendance';
import { useApiResource } from '../../hooks/useApiResource';
import { attendanceApi } from '../../services/api/attendanceApi';
import type { AttendanceTab, IconName } from '../../types';

const TABS: { key: AttendanceTab; label: string; icon: IconName }[] = [
  { key: 'details', label: 'Details', icon: 'file' },
  { key: 'ot', label: 'OT', icon: 'zap' },
  { key: 'history', label: 'History', icon: 'cal' },
];

const MonthPager: React.FC<{ month: string }> = ({ month }) => (
  <View style={styles.pager}>
    <Text style={styles.pagerArrow}>‹</Text>
    <Text style={[styles.pagerMonth, weight(800)]}>{month}</Text>
    <Text style={styles.pagerArrow}>›</Text>
  </View>
);

export const AttendanceScreen: React.FC = () => {
  const att = useAttendance();
  const { data: a, loading, error, refetch } = useApiResource(() => attendanceApi.getSummary());
  const hours = att.liveHours ?? a?.present?.hoursToday ?? '—';
  const detailsRows = a?.detailsRows ?? [];
  const otWeeks = a?.ot?.weeks ?? [];
  const dow = a?.history?.dow ?? [];
  const cells = a?.history?.cells ?? [];

  return (
    <Screen scroll contentStyle={styles.content}>
      <OfflineBanner />
      <View style={styles.header}>
        <Text style={[styles.title, weight(800)]}>Attendance</Text>
        <Text style={styles.subtitle}>Track your shifts, OT &amp; history</Text>
        <View style={styles.tabRow}>
          {TABS.map(t => {
            const active = att.tab === t.key;
            return (
              <Pressable key={t.key} style={[styles.tab, active && styles.tabActive]} onPress={() => att.setTab(t.key)}>
                <Icon name={t.icon} size={18} color={active ? colors.primary : colors.inkMuted2} strokeWidth={1.9} />
                <Text style={[styles.tabLabel, weight(700), { color: active ? colors.primary : colors.inkMuted2 }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.body}>
        {loading && !a && (
          <>
            <Skeleton height={140} style={styles.mb16} />
            <Skeleton height={180} />
          </>
        )}

        {error && !a && <ErrorState title="Couldn't load attendance" onRetry={refetch} />}

        {a && (
          <>
            <View style={styles.presentCard}>
              <View style={styles.flex1}>
                <View style={styles.presentRow}>
                  <View style={styles.presentDot} />
                  <Text style={[styles.presentLabel, weight(800)]}>Present</Text>
                </View>
                <Text style={styles.presentWindow}>{a.present?.window || '—'}</Text>
                {a.present?.punchedInOnTime && (
                  <View style={styles.punchRow}>
                    <View style={styles.punchTick}>
                      <Text style={styles.punchTickText}>✓</Text>
                    </View>
                    <Text style={styles.punchText}>Punched in on time</Text>
                  </View>
                )}
                <Text style={styles.hoursLabel}>Hours Worked Today</Text>
                <Text style={mono(24)}>{hours}</Text>
              </View>
              <ProgressRing size={88} stroke={8} pct={a.present?.pct ?? 0} label={`${a.present?.pct ?? 0}%`} labelColor={colors.primary} />
            </View>

            {att.tab === 'details' && (
              <View style={styles.card}>
                {detailsRows.map(r => (
                  <KeyValueRow key={r.k} label={r.k} value={r.v} />
                ))}
                <KeyValueRow
                  label="Status"
                  last
                  value={
                    <View style={styles.statusPill}>
                      <View style={styles.presentDot} />
                      <Text style={[styles.statusText, weight(700)]}>Active</Text>
                    </View>
                  }
                />
              </View>
            )}

            {att.tab === 'ot' && (
              <View>
                <MonthPager month={a.history?.month || '—'} />
                {!otWeeks.length ? (
                  <EmptyState icon="zap" title="No overtime hours recorded" subtitle="for this period" compact />
                ) : (
                  <>
                    <View style={styles.otSummary}>
                      <View>
                        <Text style={styles.otSmall}>Total OT Hours</Text>
                        <Text style={[mono(30), { color: colors.primaryDeep }]}>{a.ot?.totalHrs ?? '0'}</Text>
                        <Text style={styles.otRate}>
                          OT Rate · <Text style={weight(700)}>{a.ot?.rate ?? '—'}</Text>
                        </Text>
                      </View>
                      <View style={styles.otIcon}>
                        <Icon name="zap" size={30} color={colors.white} />
                      </View>
                    </View>
                    <Text style={[styles.weeklyTitle, weight(800)]}>Weekly Breakdown</Text>
                    {otWeeks.map(w => (
                      <View key={w.week} style={styles.weekRow}>
                        <View>
                          <Text style={[styles.weekName, weight(800)]}>{w.week}</Text>
                          <Text style={styles.weekRange}>{w.range}</Text>
                        </View>
                        <View style={styles.weekRight}>
                          <Text style={[styles.weekHrs, weight(800)]}>{w.hrs}</Text>
                          <Text style={styles.weekAmt}>{w.amt}</Text>
                        </View>
                      </View>
                    ))}
                    <View style={styles.otEarnings}>
                      <View style={styles.otEarningsIcon}>
                        <Icon name="trophy" size={24} color={colors.white} strokeWidth={2.2} />
                      </View>
                      <View>
                        <Text style={styles.otSmall}>Total OT Earnings</Text>
                        <Text style={[mono(26), { color: colors.primaryDeep }]}>{a.ot?.totalEarnings ?? '₹0'}</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}

            {att.tab === 'history' && (
              <View>
                <MonthPager month={a.history?.month || '—'} />
                <View style={styles.calCard}>
                  <View style={styles.dowRow}>
                    {dow.map((d, i) => (
                      <Text key={i} style={styles.dow}>{d}</Text>
                    ))}
                  </View>
                  <View style={styles.calGrid}>
                    {cells.map((c, i) => (
                      <View key={i} style={styles.calCell}>
                        <View style={[styles.calCircle, c.selected && styles.calCircleSel]}>
                          <Text style={[styles.calNum, weight(c.selected ? 700 : 500), c.selected && styles.calNumSel]}>{c.n}</Text>
                        </View>
                        <View
                          style={[
                            styles.calDot,
                            {
                              backgroundColor:
                                c.tone === 'present' ? colors.primary : c.tone === 'half' ? colors.amber : 'transparent',
                            },
                          ]}
                        />
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.historyTiles}>
                  <View style={[styles.historyTile, { backgroundColor: colors.primarySoftBg }]}>
                    <Text style={[styles.historyNum, { color: colors.primaryDeep }]}>{a.history?.presentDays ?? 0}</Text>
                    <Text style={[styles.historyLabel, { color: colors.primaryDark }]}>Present Days</Text>
                  </View>
                  <View style={[styles.historyTile, { backgroundColor: colors.amberBg }]}>
                    <Text style={[styles.historyNum, { color: colors.amberText2 }]}>{a.history?.halfDays ?? 0}</Text>
                    <Text style={[styles.historyLabel, { color: colors.amberText }]}>Half Days</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  mb16: { marginBottom: 16 },
  flex1: { flex: 1 },
  header: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  title: { fontSize: 20, marginBottom: 2 },
  subtitle: { fontSize: 12.5, color: colors.inkSecondary, marginBottom: 14 },
  tabRow: { flexDirection: 'row' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabLabel: { fontSize: 13.5 },
  body: { padding: 16 },
  presentCard: { flexDirection: 'row', gap: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 18, marginBottom: 16, ...shadows.card },
  presentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  presentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  presentLabel: { fontSize: 16, color: colors.primary },
  presentWindow: { fontSize: 12.5, color: colors.inkSecondary, marginBottom: 8 },
  punchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  punchTick: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  punchTickText: { fontSize: 9, color: colors.white, fontWeight: '800' },
  punchText: { fontSize: 12.5, color: colors.primary },
  hoursLabel: { fontSize: 11.5, color: colors.inkMuted, marginBottom: 3 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 6, ...shadows.card },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 13.5, color: colors.primary },
  pager: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, ...shadows.card },
  pagerArrow: { fontSize: 22, color: colors.inkMuted2 },
  pagerMonth: { fontSize: 15 },
  otSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primarySoftBg, borderRadius: 16, padding: 18, marginBottom: 18 },
  otSmall: { fontSize: 13, color: colors.primaryDark, marginBottom: 6 },
  otRate: { fontSize: 12.5, color: colors.primaryDark, marginTop: 8 },
  otIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  weeklyTitle: { fontSize: 14, marginBottom: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, marginBottom: 10, ...shadows.card },
  weekName: { fontSize: 14 },
  weekRange: { fontSize: 12, color: colors.inkMuted },
  weekRight: { alignItems: 'flex-end' },
  weekHrs: { fontSize: 16, color: colors.primary },
  weekAmt: { fontSize: 12, color: colors.inkMuted },
  otEarnings: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.primarySoftBg, borderRadius: 16, padding: 18, marginTop: 8 },
  otEarningsIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  calCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 16, ...shadows.card },
  dowRow: { flexDirection: 'row', marginBottom: 8 },
  dow: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.inkMuted },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  calCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calCircleSel: { backgroundColor: colors.primary },
  calNum: { fontSize: 12.5, color: colors.ink },
  calNumSel: { color: colors.white },
  calDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  historyTiles: { flexDirection: 'row', gap: 12 },
  historyTile: { flex: 1, borderRadius: 16, padding: 18 },
  historyNum: { fontSize: 30, fontWeight: '800' },
  historyLabel: { fontSize: 13 },
});
