import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Skeleton } from '../../components/feedback/Skeleton';
import { colors, weight, shadows } from '../../theme';
import { useApiResource } from '../../hooks/useApiResource';
import { ordersApi } from '../../services/api/ordersApi';
import { homeApi } from '../../services/api/homeApi';

/**
 * Read-only assigned-work visibility for the workforce picker app.
 * Item scan / qty / shortage / bag handover stay on HHD — this screen must not
 * invent those controls or imply picking can finish here.
 */
export const AssignedWorkScreen: React.FC = () => {
  const fetchPage = useCallback(async () => {
    const [assigned, home] = await Promise.all([
      ordersApi.listAssigned({ scope: 'mine', limit: 30 }).catch(() => ({
        orders: [],
        total: 0,
        page: 1,
        limit: 30,
        totalPages: 1,
      })),
      homeApi.getSummary().catch(() => null),
    ]);
    return { assigned, home };
  }, []);

  const { data, loading, error, refetch } = useApiResource(fetchPage);
  const orders = data?.assigned?.orders || [];
  const pending = data?.home?.orders?.pending ?? 0;
  const count = data?.home?.orders?.count ?? orders.length;

  return (
    <Screen
      scroll
      edges={['top']}
      testID="screen-assigned-work"
      refreshing={loading && !!data}
      onRefresh={() => {
        refetch();
      }}>
      <AppHeader title="Assigned work" />
      <View style={styles.body}>
        <View style={styles.banner} testID="assigned-work-hhd-note">
          <Text style={[styles.bannerTitle, weight(800)]}>Picking runs on HHD</Text>
          <Text style={styles.bannerCopy}>
            Scan products, adjust quantities, mark shortages, and complete bag handover on the handheld
            device. This screen shows assignment status synced from the backend.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={[styles.statValue, weight(800)]} testID="assigned-work-count">
              {count}
            </Text>
            <Text style={styles.statLabel}>Hub orders</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={[styles.statValue, weight(800)]} testID="assigned-work-pending">
              {pending}
            </Text>
            <Text style={styles.statLabel}>Pending on HHD</Text>
          </View>
        </View>

        {loading && !data ? (
          <>
            <Skeleton height={72} style={styles.mb12} />
            <Skeleton height={72} style={styles.mb12} />
          </>
        ) : null}

        {error && !data ? (
          <ErrorState title="Couldn't load assigned work" message={error} onRetry={refetch} />
        ) : null}

        {data && orders.length === 0 ? (
          <EmptyState
            icon="package"
            title="No assigned delivery tasks"
            subtitle={
              pending > 0
                ? `${pending} hub pick(s) are in progress on HHD. Open your handheld to continue picking.`
                : 'When orders are assigned, they appear here. Item picking stays on HHD.'
            }
          />
        ) : null}

        {orders.map(order => (
          <Pressable key={order.id} style={styles.card} testID={`assigned-order-${order.id}`}>
            <Text style={[styles.orderId, weight(800)]}>
              {order.orderNumber || order.id.slice(-8).toUpperCase()}
            </Text>
            <Text style={styles.meta}>
              {[order.status, order.riderStage].filter(Boolean).join(' · ') || 'Assigned'}
            </Text>
            <Text style={styles.meta}>
              {[
                order.hubName,
                order.itemCount != null ? `${order.itemCount} items` : null,
                order.customerName,
              ]
                .filter(Boolean)
                .join(' · ') || 'Synced from backend'}
            </Text>
            <Text style={styles.hint}>Open HHD to pick / scan / handover this order</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 28 },
  mb12: { marginBottom: 12 },
  banner: {
    backgroundColor: colors.primarySoftBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  bannerTitle: { fontSize: 14, color: colors.primaryDark, marginBottom: 4 },
  bannerCopy: { fontSize: 12.5, color: colors.inkSecondary, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadows.card,
  },
  statValue: { fontSize: 22, color: colors.ink },
  statLabel: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...shadows.card,
  },
  orderId: { fontSize: 15, color: colors.ink, marginBottom: 4 },
  meta: { fontSize: 12.5, color: colors.inkSecondary, marginBottom: 2 },
  hint: { fontSize: 11.5, color: colors.teal, marginTop: 8, ...weight(700) },
});
