import React, { useCallback, useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/common/Screen';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { OutlineButton } from '../../components/buttons/OutlineButton';
import { Icon } from '../../components/icons/Icon';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { colors, weight, shadows } from '../../theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import { navigate } from '../../navigation/navigationRef';
import { config } from '../../constants/config';
import type { IconName, StatusGate } from '../../types';

type ReviewPhase = 'under_review' | 'pending' | 'successful';

/** Poll while application is under review — approval comes only from the API. */
const POLL_MS = 4000;

function goToSupport() {
  // Same Onboarding stack — back returns to Status; rejected users never enter Main
  navigate('Onboarding', { screen: 'SupportSettings' });
}

const StatusHero: React.FC<{
  icon: IconName;
  bg: string;
  tone: string;
  title: string;
  children: React.ReactNode;
}> = ({ icon, bg, tone, title, children }) => (
  <View style={styles.center}>
    <View style={[styles.iconCircle, { backgroundColor: bg }]}>
      <Icon name={icon} size={42} color={tone} strokeWidth={2} />
    </View>
    <Text style={[styles.h1, weight(800)]}>{title}</Text>
    {children}
  </View>
);

const VerificationCard: React.FC<{
  items: { key: string; label: string; status: string; done: boolean }[];
}> = ({ items }) => (
  <View style={styles.reviewCard}>
    {items.map(r => (
      <View key={r.key || r.label} style={styles.reviewRow}>
        <View style={[styles.reviewMark, { backgroundColor: r.done ? colors.primary : colors.amber }]}>
          <Text style={[styles.reviewMarkText, weight(800)]}>{r.done ? '✓' : '…'}</Text>
        </View>
        <Text style={[styles.reviewLabel, weight(600)]} numberOfLines={2}>
          {r.label}
        </Text>
        <Text
          style={[styles.reviewStatus, weight(700), { color: r.done ? colors.primary : colors.amber }]}
          numberOfLines={1}>
          {r.status}
        </Text>
      </View>
    ))}
  </View>
);

function approvedCopy(nextAction: string | null | undefined) {
  switch (nextAction) {
    case 'collect_device':
      return {
        body: 'Your picker account has been approved. Collect your handheld device from the hub to start picking.',
        cta: 'Collect device',
      };
    case 'enter_app':
      return {
        body: 'Your picker account has been approved and setup is complete. Continue to the Picker App.',
        cta: 'Continue to app',
      };
    default:
      return {
        body: 'Your picker account has been approved. Complete your bank details to receive payouts.',
        cta: 'Complete bank details',
      };
  }
}

function withPhaseVerification(
  items: { key: string; label: string; status: string; done: boolean }[],
  phase: ReviewPhase,
) {
  if (phase === 'under_review') return items;
  return items.map(row => {
    if (phase === 'successful' || row.key === 'documents') {
      return { ...row, status: 'Done', done: true };
    }
    if (row.key === 'approval') {
      return { ...row, status: 'Verifying', done: false };
    }
    return { ...row, status: 'Done', done: true };
  });
}

const GateBody: React.FC<{
  gate: StatusGate;
  phase: ReviewPhase;
  rejectionReason: string | null;
  statusMessage: string | null;
  verification: { key: string; label: string; status: string; done: boolean }[];
  nextAction: 'bank_details' | 'collect_device' | 'enter_app' | null;
  canReapply: boolean;
  onApprovedContinue: () => void;
  onReapply: () => void;
}> = ({
  gate,
  phase,
  rejectionReason,
  statusMessage,
  verification,
  nextAction,
  canReapply,
  onApprovedContinue,
  onReapply,
}) => {
  const reviewPhase = gate === 'approved' ? 'successful' : gate === 'under_review' ? phase : 'under_review';

  if (gate === 'under_review' && reviewPhase !== 'successful') {
    const pending = reviewPhase === 'pending';
    return (
      <View>
        <StatusHero
          icon="clock"
          bg={colors.amberBg}
          tone={colors.amber}
          title={pending ? 'Application pending' : 'Application under review'}>
          <Text style={styles.copy}>
            {pending ? (
              'Documents are in final checks. This will complete automatically in a moment.'
            ) : (
              <>
                Your documents, KYC and face verification are being checked. This usually takes{' '}
                <Text style={weight(700)}>a few seconds</Text>.
              </>
            )}
          </Text>
        </StatusHero>
        {verification.length > 0 ? (
          <VerificationCard items={withPhaseVerification(verification, reviewPhase)} />
        ) : null}
        <Text style={styles.hint}>Status updates automatically — no need to wait and refresh.</Text>
      </View>
    );
  }

  if (gate === 'approved' || reviewPhase === 'successful') {
    const copy = approvedCopy(nextAction);
    return (
      <View style={styles.center}>
        <StatusHero icon="check" bg={colors.primarySoftBg} tone={colors.primary} title="Application approved">
          <Text style={styles.copy}>{copy.body}</Text>
        </StatusHero>
        <PrimaryButton label={copy.cta} onPress={onApprovedContinue} style={styles.fullBtn} />
      </View>
    );
  }

  if (gate === 'rejected') {
    return (
      <View style={styles.center}>
        <StatusHero icon="close" bg={colors.dangerBg} tone={colors.danger} title="Application rejected">
          <Text style={styles.copy}>
            {rejectionReason || 'No rejection reason was provided. Contact support for more information.'}
          </Text>
        </StatusHero>
        {canReapply ? (
          <PrimaryButton label="Re-apply" onPress={onReapply} style={styles.stackBtn} />
        ) : null}
        <OutlineButton label="Contact support" onPress={goToSupport} style={styles.fullBtn} />
      </View>
    );
  }

  if (gate === 'blocked') {
    return (
      <View style={styles.center}>
        <StatusHero icon="lock" bg={colors.dangerBg} tone={colors.danger} title="Account blocked">
          <Text style={styles.copy}>
            {statusMessage || 'Your account has been blocked. Contact support for assistance.'}
          </Text>
        </StatusHero>
        <OutlineButton label="Contact support" onPress={goToSupport} style={styles.fullBtn} />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <StatusHero icon="alert" bg={colors.amberBg} tone={colors.amber} title="Account suspended">
        <Text style={styles.copy}>
          {statusMessage || 'Your account is temporarily suspended. Contact support for details.'}
        </Text>
      </StatusHero>
      <OutlineButton label="Contact support" onPress={goToSupport} style={styles.fullBtn} />
    </View>
  );
};

const LoadingSkeleton: React.FC = () => (
  <View style={styles.center}>
    <Skeleton height={100} width={100} radius={50} style={styles.skelCircle} />
    <Skeleton height={22} width="70%" radius={8} style={styles.skelTitle} />
    <Skeleton height={14} width="88%" radius={6} style={styles.skelLine} />
    <Skeleton height={14} width="62%" radius={6} style={styles.skelLine} />
    <Skeleton height={168} radius={16} style={styles.skelCard} />
  </View>
);

export const StatusGateScreen: React.FC = () => {
  const navigation = useNavigation();
  const ob = useOnboarding();
  const {
    gate,
    refreshStatus,
    statusHydrated,
    statusLoading,
    statusError,
    application,
    approvedContinue,
    reapply,
    markLocalApproved,
  } = ob;

  useFocusEffect(
    useCallback(() => {
      void refreshStatus();
    }, [refreshStatus]),
  );

  // Block hardware / gesture back to Wizard — leave only via CTAs or Support push.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', e => {
      const type = e.data.action.type;
      if (type === 'GO_BACK' || type === 'POP') {
        e.preventDefault();
      }
    });
    return unsub;
  }, [navigation]);

  // Poll API while under review. Production never locally auto-approves.
  useEffect(() => {
    if (gate !== 'under_review' || !statusHydrated) return;

    const poll = setInterval(() => {
      void refreshStatus({ silent: true });
    }, POLL_MS);

    return () => clearInterval(poll);
  }, [gate, statusHydrated, refreshStatus]);

  // Development only: treat the current picker as Verified so Status can continue.
  useEffect(() => {
    if (!config.DEV_AUTO_VERIFY || !statusHydrated) return;
    if (gate !== 'under_review') return;
    markLocalApproved();
  }, [gate, statusHydrated, markLocalApproved]);

  const phase: ReviewPhase = gate === 'approved' ? 'successful' : 'under_review';
  const showLoading = !statusHydrated;
  const showError = Boolean(statusError) && !statusHydrated;

  return (
    <Screen
      scroll
      padded
      onRefresh={() => { void refreshStatus(); }}
      refreshing={statusLoading && statusHydrated}>
      {showLoading && !showError ? <LoadingSkeleton /> : null}
      {showError ? (
        <ErrorState
          title="Couldn't load application status"
          message={statusError || 'Check your connection and try again.'}
          onRetry={() => { void refreshStatus(); }}
        />
      ) : null}
      {statusHydrated ? (
        <GateBody
          gate={gate}
          phase={phase}
          rejectionReason={application?.rejectionReason ?? null}
          statusMessage={application?.statusMessage ?? null}
          verification={application?.verification ?? []}
          nextAction={application?.nextAction ?? null}
          canReapply={Boolean(application?.canReapply)}
          onApprovedContinue={approvedContinue}
          onReapply={reapply}
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', alignSelf: 'stretch' },
  iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  h1: { fontSize: 21, marginBottom: 8, textAlign: 'center', color: colors.ink },
  copy: { fontSize: 13.5, color: colors.inkSecondary, lineHeight: 22, textAlign: 'center', marginBottom: 22 },
  reviewCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, ...shadows.card },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  reviewMark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reviewMarkText: { color: colors.white, fontSize: 12 },
  reviewLabel: { flex: 1, fontSize: 13.5, color: colors.ink, flexShrink: 1 },
  reviewStatus: { fontSize: 12, flexShrink: 0, maxWidth: '36%', textAlign: 'right' },
  hint: { textAlign: 'center', fontSize: 11.5, color: colors.inkMuted2, marginTop: 16 },
  stackBtn: { marginBottom: 12, alignSelf: 'stretch' },
  fullBtn: { alignSelf: 'stretch' },
  skelCircle: { marginBottom: 20 },
  skelTitle: { marginBottom: 12 },
  skelLine: { marginBottom: 8 },
  skelCard: { marginTop: 18, alignSelf: 'stretch' },
});
