import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Skeleton } from '../../components/feedback/Skeleton';
import { colors, weight, mono, shadows } from '../../theme';
import { useApiResource } from '../../hooks/useApiResource';
import { salaryApi } from '../../services/api/salaryApi';

function monthKeyFromOffset(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function Row({ label, value, emphasize, danger, muted }: {
  label: string;
  value: string;
  emphasize?: boolean;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, muted && styles.muted]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          mono(15),
          emphasize && weight(800),
          danger && { color: colors.danger },
          muted && styles.muted,
        ]}>
        {value}
      </Text>
    </View>
  );
}

export const SalaryScreen: React.FC = () => {
  const [monthOffset, setMonthOffset] = useState(0);
  const month = useMemo(() => monthKeyFromOffset(monthOffset), [monthOffset]);
  const { data, loading, error, refetch } = useApiResource(
    () => salaryApi.getMonthly({ month }),
    [month],
  );
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 600);
  }, [refetch]);

  const r = data?.regular;
  const o = data?.overtime;
  const b = data?.breakdown;

  return (
    <Screen scroll edges={['top']} onRefresh={onRefresh} refreshing={refreshing} testID="screen-salary">
      <AppHeader title="Salary" />
      <View style={styles.body}>
        <View style={styles.monthBar}>
          <Pressable
            onPress={() => setMonthOffset(v => v - 1)}
            style={styles.monthBtn}
            testID="salary-month-prev"
            accessibilityLabel="Previous month">
            <Text style={[styles.monthBtnText, weight(700)]}>‹</Text>
          </Pressable>
          <Text style={[styles.monthLabel, weight(800)]} testID="salary-month-label">
            {data?.month || month}
          </Text>
          <Pressable
            onPress={() => setMonthOffset(v => Math.min(0, v + 1))}
            style={[styles.monthBtn, monthOffset >= 0 && styles.monthBtnDisabled]}
            disabled={monthOffset >= 0}
            testID="salary-month-next"
            accessibilityLabel="Next month">
            <Text style={[styles.monthBtnText, weight(700)]}>›</Text>
          </Pressable>
        </View>

        {loading && !data && (
          <>
            <Skeleton height={140} style={styles.mb16} />
            <Skeleton height={180} style={styles.mb16} />
            <Skeleton height={120} />
          </>
        )}

        {error && !data && <ErrorState title="Couldn't load salary" onRetry={refetch} />}

        {!loading && !error && !data && (
          <EmptyState icon="wallet" title="No salary data" subtitle="for this period" />
        )}

        {data && r && o && b && (
          <>
            <View style={styles.hero} testID="salary-final-card">
              <Text style={styles.heroDim}>Final payable · {data.month}</Text>
              <Text style={[styles.heroAmt, mono(36)]} testID="salary-final-amount">
                {data.finalSalaryDisplay}
              </Text>
              <Text style={styles.heroHint}>
                Monthly − leave + OT
              </Text>
            </View>

            <View style={styles.card} testID="salary-regular-card">
              <Text style={[styles.cardTitle, weight(800)]}>Regular Salary</Text>
              <Row label="Monthly Salary" value={b.monthlySalary} emphasize />
              <Row label="Daily Rate" value={r.dailySalaryDisplay} muted />
              <Row label="Working Days" value={b.workingDays} />
              <Row label="Week-Offs (paid)" value={b.weekOffs} />
              <Row label="Paid Days" value={b.paidDays} />
            </View>

            <View style={styles.card} testID="salary-leave-card">
              <Text style={[styles.cardTitle, weight(800)]}>Leave Deduction</Text>
              <Row label="Unpaid Leave" value={b.unpaidLeave} />
              <Row label="Leave Deduction" value={b.leaveDeduction} danger={r.leaveDeduction > 0} emphasize />
              <Text style={styles.note}>
                The {data.config.weekOffAllowance} paid week-offs are not deducted.
              </Text>
            </View>

            <View style={styles.card} testID="salary-ot-card">
              <Text style={[styles.cardTitle, weight(800)]}>OT Earnings</Text>
              <Row label="OT Hours" value={b.otHours} />
              <Row label="OT Rate" value={b.otRate} />
              <Row label="OT Earnings" value={b.otEarnings} emphasize />
              {(o.weekOffWorkEarnings > 0 || o.weekOffWorkHours > 0) && (
                <Row
                  label="Week-off Work"
                  value={o.weekOffWorkEarningsDisplay}
                  emphasize
                />
              )}
              <Text style={styles.note}>
                OT applies only beyond the {data.config.standardShiftHours}h scheduled shift
                (break & handovers are not OT).
              </Text>
            </View>

            <View style={[styles.card, styles.totalCard]} testID="salary-breakdown-card">
              <Text style={[styles.cardTitle, weight(800)]}>Monthly Breakdown</Text>
              <Row label="Monthly Salary" value={b.monthlySalary} />
              <Row label="Leave Deduction" value={`− ${b.leaveDeduction}`} danger={r.leaveDeduction > 0} />
              <Row label="OT Earnings" value={`+ ${b.otEarnings}`} />
              {o.weekOffWorkEarnings > 0 && (
                <Row label="Week-off Work" value={`+ ${b.weekOffWorkEarnings}`} />
              )}
              <View style={styles.hr} />
              <Row label="Final Salary" value={b.finalSalary} emphasize />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 32 },
  mb16: { marginBottom: 16 },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBtnDisabled: { opacity: 0.4 },
  monthBtnText: { fontSize: 22, color: colors.ink },
  monthLabel: { fontSize: 16, color: colors.ink },
  hero: {
    backgroundColor: colors.inkGreen,
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
  },
  heroDim: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
  heroAmt: { color: colors.white, marginTop: 8 },
  heroHint: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
    ...shadows.card,
  },
  totalCard: { borderColor: colors.primary, borderWidth: 1.5 },
  cardTitle: { fontSize: 15, color: colors.ink, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 12,
  },
  rowLabel: { fontSize: 13.5, color: colors.inkMuted, flex: 1 },
  rowValue: { fontSize: 15, color: colors.ink, textAlign: 'right' },
  muted: { color: colors.inkMuted2 },
  note: { fontSize: 11.5, color: colors.inkMuted, marginTop: 8, lineHeight: 16 },
  hr: { height: 1, backgroundColor: colors.borderHair, marginVertical: 8 },
});
