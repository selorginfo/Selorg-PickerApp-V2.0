import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { IconChip } from '../../components/cards/IconChip';
import { colors, weight, mono, shadows } from '../../theme';
import { useApiResource } from '../../hooks/useApiResource';
import { performanceApi } from '../../services/api/performanceApi';

export const PerformanceScreen: React.FC = () => {
  const { data: p, loading, error, refetch } = useApiResource(() => performanceApi.getSummary());
  const cards = p?.cards ?? [];
  const weekBars = p?.weekBars ?? [];

  return (
    <Screen scroll contentStyle={styles.content}>
      <OfflineBanner />
      <View style={styles.pad}>
        <Text style={[styles.title, weight(800)]}>My Performance</Text>
        <Text style={styles.subtitle}>Orders, time, and accuracy metrics</Text>

        {loading && !p && (
          <>
            <View style={styles.grid}>
              {[0, 1, 2, 3].map(i => (
                <Skeleton key={i} height={120} width="48%" />
              ))}
            </View>
            <Skeleton height={160} style={styles.mt14} />
          </>
        )}

        {error && !p && <ErrorState title="Couldn't load performance" onRetry={refetch} />}

        {p && !cards.length && !weekBars.length ? (
          <EmptyState icon="trophy" title="No performance data yet" subtitle="Complete shifts to see your metrics" compact />
        ) : null}

        {p && (
          <>
            {cards.length > 0 && (
              <View style={styles.grid}>
                {cards.map(c => (
                  <View key={c.label} style={styles.tile}>
                    <IconChip name={c.icon} color={c.color} bg={c.bg} />
                    <Text style={[styles.tileValue, mono(26)]}>{c.value}</Text>
                    <Text style={styles.tileLabel}>{c.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {weekBars.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={[styles.chartTitle, weight(800)]}>Weekly Earnings</Text>
                <Text style={styles.chartSub}>Your performance this week</Text>
                <View style={styles.bars}>
                  {weekBars.map((b, i) => (
                    <View key={`week-bar-${i}-${b.d}`} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.bar,
                            { height: `${b.pct}%`, backgroundColor: b.highlight ? colors.primary : '#CDE7D5' },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>{b.d}</Text>
                    </View>
                  ))}
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
  pad: { padding: 16 },
  mt14: { marginTop: 14 },
  title: { fontSize: 22, marginBottom: 2 },
  subtitle: { fontSize: 13, color: colors.inkSecondary, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  tile: {
    width: '48%',
    flexGrow: 1,
    maxWidth: '48%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    ...shadows.card,
  },
  tileValue: { marginTop: 12 },
  tileLabel: { fontSize: 12.5, color: colors.inkSecondary, ...weight(600) },
  chartCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18, ...shadows.card },
  chartTitle: { fontSize: 15, marginBottom: 4 },
  chartSub: { fontSize: 12.5, color: colors.inkSecondary, marginBottom: 18 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, minHeight: 100, height: '18%', maxHeight: 160 },
  barCol: { flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel: { fontSize: 10.5, color: colors.inkMuted, ...weight(600) },
});
