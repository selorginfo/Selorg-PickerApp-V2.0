import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { colors, weight, shadows } from '../../theme';
import { useUI } from '../../hooks/useUI';
import { useApiResource } from '../../hooks/useApiResource';
import { supportApi } from '../../services/api/supportApi';

export const FaqsScreen: React.FC = () => {
  const { faqOpen, setFaqOpen } = useUI();
  const { data, loading, error, refetch } = useApiResource(() => supportApi.faqs());
  const faqs = data ?? [];

  return (
    <Screen scroll edges={['top']}>
      <AppHeader title="FAQs" />
      <View style={styles.body}>
        {loading && !data && (
          <>
            <Skeleton height={56} style={styles.mb10} />
            <Skeleton height={56} style={styles.mb10} />
            <Skeleton height={56} />
          </>
        )}

        {error && !data && <ErrorState title="Couldn't load FAQs" onRetry={refetch} />}

        {data && !faqs.length ? (
          <EmptyState icon="chat" title="No FAQs available" subtitle="Check back later for help articles" compact />
        ) : null}

        {faqs.map((f, i) => {
          const open = faqOpen === i;
          return (
            <View key={f.q} style={styles.item}>
              <Pressable style={styles.row} onPress={() => setFaqOpen(i)}>
                <Text style={[styles.q, weight(700)]}>{f.q}</Text>
                <View style={styles.chev}>
                  <Text style={[styles.chevText, weight(800)]}>{open ? '−' : '+'}</Text>
                </View>
              </Pressable>
              {open ? <Text style={styles.a}>{f.a}</Text> : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 28 },
  mb10: { marginBottom: 10 },
  item: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 16, marginBottom: 10, ...shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  q: { flex: 1, fontSize: 14, color: colors.ink },
  chev: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.neutralGreenBg, alignItems: 'center', justifyContent: 'center' },
  chevText: { fontSize: 16, color: colors.primary },
  a: { fontSize: 13, color: colors.inkSecondary, lineHeight: 21, paddingBottom: 16 },
});
