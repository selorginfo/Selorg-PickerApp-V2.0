import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Skeleton } from '../../components/feedback/Skeleton';
import { IconChip } from '../../components/cards/IconChip';
import { colors, weight, shadows } from '../../theme';
import { useApiResource } from '../../hooks/useApiResource';
import { notificationApi } from '../../services/api/notificationApi';

export const NotificationsScreen: React.FC = () => {
  const { data, loading, error, refetch } = useApiResource(() => notificationApi.list());
  const items = data ?? [];

  return (
    <Screen scroll edges={['top']}>
      <AppHeader title="Notifications" />
      {loading && !data && (
        <View style={styles.body}>
          <Skeleton height={72} style={styles.mb10} />
          <Skeleton height={72} style={styles.mb10} />
          <Skeleton height={72} />
        </View>
      )}
      {error && !data && <ErrorState title="Couldn't load notifications" onRetry={refetch} />}
      {!loading && !error && !items.length ? (
        <EmptyState icon="bell" title="You're all caught up" subtitle="No new notifications" />
      ) : null}
      {items.length > 0 && (
        <View style={styles.body}>
          {items.map(n => (
            <View key={n.id} style={styles.row}>
              <IconChip name={n.icon} color={n.color} bg={n.bg} />
              <View style={styles.flex1}>
                <Text style={[styles.title, weight(800)]}>{n.title}</Text>
                <Text style={styles.text}>{n.body}</Text>
                <Text style={styles.time}>{n.time}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 28 },
  mb10: { marginBottom: 10 },
  flex1: { flex: 1 },
  row: { flexDirection: 'row', gap: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 15, marginBottom: 10, ...shadows.card },
  title: { fontSize: 14, marginBottom: 2 },
  text: { fontSize: 12.5, color: colors.inkSecondary, lineHeight: 18 },
  time: { fontSize: 11, color: colors.inkMuted2, marginTop: 6 },
});
