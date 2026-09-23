import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { ProgressRing } from '../../components/common/ProgressRing';
import { Icon } from '../../components/icons/Icon';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { colors, weight, shadows } from '../../theme';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../hooks/useUI';
import { useApiResource } from '../../hooks/useApiResource';
import { trainingApi } from '../../services/api/trainingApi';
import { pct } from '../../utils/formatters';

export const TrainingScreen: React.FC = () => {
  const { state } = useStore();
  const { openVideo } = useUI();
  const { data, loading, error, refetch } = useApiResource(() => trainingApi.listVideos());
  const modules = data ?? [];
  const done = state.support.profTrainDone;
  const count = done.filter(Boolean).length;
  const total = modules.length;
  const allDone = count >= total && total > 0;

  return (
    <Screen scroll edges={['top']}>
      <AppHeader title="Training" />
      <View style={styles.body}>
        {loading && !data && (
          <>
            <Skeleton height={90} style={styles.mb18} />
            <Skeleton height={64} style={styles.mb10} />
            <Skeleton height={64} />
          </>
        )}

        {error && !data && <ErrorState title="Couldn't load training" onRetry={refetch} />}

        {data && (
          <>
            <View style={styles.banner}>
              <ProgressRing size={66} stroke={7} pct={(count / Math.max(total, 1)) * 100} track="#CDE7D5" label={pct(count, total)} labelColor={colors.primaryDeep} labelSize={14} />
              <View style={styles.flex1}>
                <Text style={[styles.bannerTitle, weight(800)]}>
                  {!total ? 'No modules yet' : allDone ? 'All modules complete' : 'Complete your training'}
                </Text>
                <Text style={styles.bannerSub}>
                  {!total
                    ? 'Training videos will appear here'
                    : allDone
                      ? `${total} of ${total} · certified picker`
                      : `${count} of ${total} watched · tap a lesson to play`}
                </Text>
              </View>
            </View>

            {!modules.length ? (
              <EmptyState icon="book" title="No training modules" subtitle="Check back later for new lessons" compact />
            ) : (
              modules.map((m, i) => {
                const isDone = done[i];
                const label = m.name || m.title || 'Training module';
                return (
                  <Pressable
                    key={m.videoId || label}
                    style={styles.row}
                    onPress={() => openVideo('profile', i, label, m.videoId)}>
                    <View style={[styles.mark, { backgroundColor: isDone ? colors.primary : colors.inkGreen }]}>
                      <Icon name={isDone ? 'check' : 'play'} size={18} color={colors.white} strokeWidth={2.6} />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={[styles.name, weight(800)]}>{label}</Text>
                      <Text style={styles.sub}>{isDone ? `${m.dur} · completed` : `${m.dur} · tap to watch`}</Text>
                    </View>
                    <Icon name="chevronRight" size={18} color={colors.inkDisabled} strokeWidth={2} />
                  </Pressable>
                );
              })
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
  mb10: { marginBottom: 10 },
  flex1: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.primarySoftBg, borderRadius: 18, padding: 18, marginBottom: 18 },
  bannerTitle: { fontSize: 16, color: colors.primaryDeep },
  bannerSub: { fontSize: 12.5, color: colors.primaryDark, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 15, marginBottom: 10, ...shadows.card },
  mark: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14 },
  sub: { fontSize: 12, color: colors.inkMuted },
});
