import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { MainStackNavigation } from '../../navigation/navigationTypes';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Skeleton } from '../../components/feedback/Skeleton';
import { StatusBadge } from '../../components/badges/StatusBadge';
import { Icon } from '../../components/icons/Icon';
import { colors, weight, mono, shadows } from '../../theme';
import { useWallet } from '../../hooks/useWallet';
import { useApiResource } from '../../hooks/useApiResource';
import { walletApi } from '../../services/api/walletApi';
import { useStore } from '../../store/AppStore';
import { formatSubmittedDate } from '../../utils/formatters';
import type { PayoutMethodStatus } from '../../types/api';
import type { BadgeTone } from '../../types';

const POLL_MS = 30_000;

const REVIEW_SLA = 'usually reviewed within 24 hours';

/**
 * Bank and UPI are verified by an admin, so the row explains where a submission
 * currently sits instead of only showing a bare "Pending" badge.
 */
function payoutMethodRow(
  status: PayoutMethodStatus | undefined,
  submittedAt?: string | null,
  rejectionReason?: string | null,
  hasValue?: boolean,
): { label: string; tone: BadgeTone; hint: string | null } {
  const resolved = status ?? (hasValue ? 'pending' : 'none');
  if (resolved === 'verified') {
    return { label: 'Verified', tone: 'success', hint: null };
  }
  if (resolved === 'rejected') {
    return {
      label: 'Rejected',
      tone: 'danger',
      hint: rejectionReason || 'Tap to update your details and submit again',
    };
  }
  if (resolved === 'pending') {
    const submitted = formatSubmittedDate(submittedAt);
    return {
      label: 'Pending',
      tone: 'warning',
      hint: submitted ? `Submitted ${submitted} · ${REVIEW_SLA}` : `Awaiting review · ${REVIEW_SLA}`,
    };
  }
  return { label: 'Not added', tone: 'neutral', hint: 'Tap to add your details' };
}

function txnStatusLabel(status?: string): { label: string; color: string } {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'paid' || s === 'success') {
    return { label: 'Paid', color: colors.primary };
  }
  if (s === 'pending' || s === 'processing' || s === 'approved') {
    return { label: 'Pending', color: colors.amber };
  }
  if (s === 'failed' || s === 'rejected') {
    return { label: 'Failed', color: colors.danger };
  }
  return { label: 'Paid', color: colors.primary };
}

export const PayoutsScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigation>();
  const { state } = useStore();
  const wallet = useWallet({ pollBalance: true });
  const {
    data: txnsData,
    loading: txnsLoading,
    refetch: refetchTxns,
  } = useApiResource(() => walletApi.getTransactions(), [state.wallet.txNonce], { pollMs: POLL_MS });
  const [refreshing, setRefreshing] = useState(false);

  const balance = wallet.walletSummary;
  const payouts = txnsData ?? [];
  const loading = (wallet.loading && !balance) || (txnsLoading && !txnsData);
  const showError = !balance && !wallet.loading;

  const refetchBalance = wallet.refetchBalance;
  const refetch = useCallback(() => {
    refetchBalance();
    refetchTxns();
  }, [refetchBalance, refetchTxns]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 600);
  }, [refetch]);

  const bankRow = payoutMethodRow(
    balance?.bankStatus,
    balance?.bankSubmittedAt,
    balance?.bankRejectionReason,
    Boolean(balance?.bankLabel),
  );
  const upiRow = payoutMethodRow(
    balance?.upiStatus,
    balance?.upiSubmittedAt,
    balance?.upiRejectionReason,
    balance?.upiVerified,
  );

  return (
    <Screen scroll edges={['top']} onRefresh={onRefresh} refreshing={refreshing}>
      <AppHeader title="Payouts" />
      <View style={styles.body}>
        {loading && (
          <>
            <Skeleton height={180} style={styles.mb16} />
            <Skeleton height={120} style={styles.mb16} />
            <Skeleton height={80} />
          </>
        )}

        {showError && <ErrorState title="Couldn't load payouts" onRetry={refetch} />}

        {balance && (
          <>
            <View style={styles.payoutCard}>
              <Text style={styles.dim}>Current Month · {balance.month || '—'}</Text>
              <Text style={[styles.dim, styles.mt14]}>Net Payout</Text>
              <Text style={[styles.net, mono(38)]}>{balance.netPayout}</Text>
              <Text style={styles.dim}>Pay date: {balance.payDate || '—'}</Text>
              <View style={styles.hr} />
              <View style={styles.withdrawRow}>
                <View style={styles.withdrawMeta}>
                  <Text style={styles.dimSmall}>Available to withdraw</Text>
                  <Text style={[styles.avail, mono(19)]}>{balance.available}</Text>
                </View>
                <Pressable
                  style={[styles.withdrawBtn, !wallet.canWithdraw && styles.withdrawBtnDisabled]}
                  onPress={wallet.openWithdraw}
                >
                  <Text style={[styles.withdrawLabel, weight(800)]}>Withdraw</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.verifyCard}>
              <Text style={[styles.verifyTitle, weight(800)]}>Bank &amp; UPI verification</Text>
              <Pressable
                style={[styles.verifyRow, styles.verifyDivider]}
                onPress={() => navigation.navigate('BankDetails')}
              >
                <View style={styles.verifyMeta}>
                  <Text style={styles.verifyLabel}>Bank account</Text>
                  {bankRow.hint ? <Text style={styles.verifyHint}>{bankRow.hint}</Text> : null}
                </View>
                <View style={styles.verifyRight}>
                  <StatusBadge label={bankRow.label} tone={bankRow.tone} small />
                  <Icon name="chevronRight" size={18} color={colors.inkMuted2} strokeWidth={2} />
                </View>
              </Pressable>
              <Pressable style={styles.verifyRow} onPress={() => navigation.navigate('UpiDetails')}>
                <View style={styles.verifyMeta}>
                  <Text style={styles.verifyLabel}>UPI</Text>
                  {upiRow.hint ? <Text style={styles.verifyHint}>{upiRow.hint}</Text> : null}
                </View>
                <View style={styles.verifyRight}>
                  <StatusBadge label={upiRow.label} tone={upiRow.tone} small />
                  <Icon name="chevronRight" size={18} color={colors.inkMuted2} strokeWidth={2} />
                </View>
              </Pressable>
            </View>

            <Text style={[styles.historyTitle, weight(800)]}>Transaction history</Text>
            {!payouts.length ? (
              <EmptyState
                icon="file"
                title="No transaction history yet"
                subtitle="Your monthly payouts will appear here"
                compact
              />
            ) : (
              payouts.map((p, i) => {
                const st = txnStatusLabel(p.status);
                return (
                  <View key={p.id || `${i}-${p.month}-${p.amt}`} style={styles.txnRow}>
                    <View>
                      <Text style={[styles.txnMonth, weight(800)]}>{p.month}</Text>
                      <Text style={styles.txnMeta}>
                        {p.date} · {p.mode}
                      </Text>
                    </View>
                    <View style={styles.txnRight}>
                      <Text style={mono(16)}>{p.amt}</Text>
                      <Text style={[styles.paid, weight(800), { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
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
  mb16: { marginBottom: 16 },
  mt14: { marginTop: 14 },
  payoutCard: { backgroundColor: colors.inkGreen, borderRadius: 20, padding: 22, marginBottom: 16 },
  dim: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
  dimSmall: { fontSize: 11.5, color: 'rgba(255,255,255,0.7)' },
  net: { color: colors.gold, marginVertical: 2 },
  hr: { height: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 16 },
  withdrawRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  withdrawMeta: { flex: 1, minWidth: 140 },
  avail: { color: colors.white },
  withdrawBtn: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  withdrawBtnDisabled: { opacity: 0.55 },
  withdrawLabel: { color: colors.inkGreen, fontSize: 14 },
  verifyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    ...shadows.card,
  },
  verifyTitle: { fontSize: 15, marginBottom: 14 },
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  verifyDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderHair },
  verifyMeta: { flex: 1, paddingRight: 10 },
  verifyLabel: { fontSize: 13.5, ...weight(600), color: colors.ink },
  verifyHint: { fontSize: 11, color: colors.inkMuted, marginTop: 3, lineHeight: 15 },
  verifyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyTitle: { fontSize: 14, marginBottom: 12, paddingLeft: 2 },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 10,
    ...shadows.card,
  },
  txnMonth: { fontSize: 14 },
  txnMeta: { fontSize: 12, color: colors.inkMuted },
  txnRight: { alignItems: 'flex-end' },
  paid: { fontSize: 11, color: colors.primary },
});
