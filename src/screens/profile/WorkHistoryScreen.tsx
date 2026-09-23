import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { StatusBadge } from '../../components/badges/StatusBadge';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { colors, weight, shadows } from '../../theme';
import { useApiResource } from '../../hooks/useApiResource';
import { profileApi } from '../../services/api/profileApi';

export const WorkHistoryScreen: React.FC = () => {
  const { data: wh, loading, error, refetch } = useApiResource(() => profileApi.getWorkHistory());
  const rows = wh?.rows ?? [];
  const present = wh?.summary?.present ?? '0';
  const overtime = wh?.summary?.overtime ?? '0h';
  const total = wh?.summary?.total ?? '0';

  return (
    <Screen scroll edges={['top']}>
      <AppHeader title="Work history" />
      <View style={styles.body}>
        {loading && !wh && (
          <>
            <Skeleton height={48} style={styles.mb18} />
            <Skeleton height={80} style={styles.mb18} />
            <Skeleton height={64} />
          </>
        )}

        {error && !wh && <ErrorState title="Couldn't load work history" onRetry={refetch} />}

        {wh && (
          <>
            <View style={styles.pager}>
              <Text style={styles.arrow}>‹</Text>
              <Text style={[styles.month, weight(800)]}>{wh.month || '—'}</Text>
              <Text style={styles.arrow}>›</Text>
            </View>

            <View style={styles.tiles}>
              <View style={[styles.tile, { backgroundColor: colors.primarySoftBg }]}>
                <Text style={[styles.tileNum, { color: colors.primaryDeep }]}>{present}</Text>
                <Text style={[styles.tileLabel, { color: colors.primaryDark }]}>Present</Text>
              </View>
              <View style={[styles.tile, { backgroundColor: colors.amberBg }]}>
                <Text style={[styles.tileNum, { color: colors.amberText2 }]}>{overtime}</Text>
                <Text style={[styles.tileLabel, { color: colors.amberText }]}>Overtime</Text>
              </View>
              <View style={[styles.tile, { backgroundColor: colors.tealBg }]}>
                <Text style={[styles.tileNum, { color: colors.tealDeep }]}>{total}</Text>
                <Text style={[styles.tileLabel, { color: colors.tealDeep }]}>Total</Text>
              </View>
            </View>

            {!rows.length ? (
              <EmptyState icon="cal" title="No work history yet" subtitle="Completed shifts will appear here" compact />
            ) : (
              rows.map((r, i) => (
                <View key={`${r.date}-${i}`} style={styles.row}>
                  <View>
                    <Text style={[styles.date, weight(800)]}>{r.date}</Text>
                    <Text style={styles.meta}>
                      {r.hub} · {r.hrs}
                    </Text>
                  </View>
                  <StatusBadge label={r.badge} tone={r.tone} />
                </View>
              ))
            )}
          </>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 28 },
  mb18: { marginBottom: 18 },
  pager: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 18, ...shadows.card },
  arrow: { fontSize: 22, color: colors.inkMuted2 },
  month: { fontSize: 15 },
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  tile: { flex: 1, borderRadius: 14, padding: 14 },
  tileNum: { fontSize: 24, fontWeight: '800' },
  tileLabel: { fontSize: 11.5, ...weight(600) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, marginBottom: 10, ...shadows.card },
  date: { fontSize: 14 },
  meta: { fontSize: 12, color: colors.inkMuted },
});
