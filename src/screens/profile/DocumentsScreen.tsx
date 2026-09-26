import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { MainStackNavigation } from '../../navigation/navigationTypes';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { IconChip } from '../../components/cards/IconChip';
import { StatusBadge } from '../../components/badges/StatusBadge';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { colors, radius, weight, mono } from '../../theme';
import { DOC_LIST } from '../../mock/documents';
import { profileApi } from '../../services/api/profileApi';
import { ApiError } from '../../services/api/client';
import { maskKycNumber, normalizeKycDocType } from '../../services/api/mappers';
import type { DocumentDto, KycDocumentType } from '../../types/api';
import type { BadgeTone } from '../../types';

type DocUiStatus = 'missing' | 'pending' | 'approved' | 'rejected';

function findLatest(docs: DocumentDto[], code: string): DocumentDto | undefined {
  return docs.find(d => normalizeKycDocType(d.type) === code);
}

function mapRowStatus(_code: string, row: DocumentDto | undefined): DocUiStatus {
  if (!row) return 'missing';
  const s = String(row.status || '').toLowerCase();
  if (s === 'rejected') return 'rejected';
  if (s === 'approved' || s === 'verified') return 'approved';
  if (s === 'pending' || row.url || row.documentNumber) return 'pending';
  return 'missing';
}

function subtitle(code: string, status: DocUiStatus, row?: DocumentDto): string {
  const num = maskKycNumber(code, row?.documentNumber);
  if (num) return num;
  if (status === 'approved') return 'Verified';
  if (status === 'rejected') return 'Rejected — re-upload';
  if (status === 'pending') return 'Uploaded · interview review';
  return DOC_LIST.find(d => d.code === code)?.sub || 'Not uploaded';
}

function badge(status: DocUiStatus): { label: string; tone: BadgeTone } {
  if (status === 'approved') return { label: 'Verified', tone: 'success' };
  if (status === 'rejected') return { label: 'Re-upload', tone: 'danger' };
  if (status === 'pending') return { label: 'Review', tone: 'warning' };
  return { label: 'Upload', tone: 'warning' };
}

export const DocumentsScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigation>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocumentDto[]>([]);

  const syncFromServer = useCallback(async () => {
    setError(null);
    try {
      setDocs(await profileApi.listKycDocuments());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void syncFromServer();
    }, [syncFromServer]),
  );

  const rows = useMemo(
    () =>
      DOC_LIST.map(d => {
        const row = findLatest(docs, d.code);
        const status = mapRowStatus(d.code, row);
        return { ...d, row, status, num: subtitle(d.code, status, row) };
      }),
    [docs],
  );

  const openDoc = (code: KycDocumentType) => {
    navigation.navigate('UploadDocument', { type: code });
  };

  return (
    <Screen scroll edges={['top']} background={colors.white}>
      <AppHeader title="Documents" />
      <View style={styles.body}>
        {loading && !docs.length ? (
          <>
            <Skeleton height={72} radius={14} style={styles.mb10} />
            <Skeleton height={72} radius={14} style={styles.mb10} />
            <Skeleton height={72} radius={14} />
          </>
        ) : null}

        {error && !loading && !docs.length ? (
          <ErrorState
            title="Couldn't load documents"
            message={error}
            onRetry={() => {
              setLoading(true);
              void syncFromServer();
            }}
          />
        ) : null}

        {!loading || docs.length > 0 ? (
          <>
            {rows.map(d => {
              const missing = d.status === 'missing';
              const pill = badge(d.status);
              return (
                <Pressable
                  key={d.code}
                  style={styles.card}
                  onPress={() => openDoc(d.code)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.label}, ${pill.label}`}>
                  <IconChip
                    name="file"
                    color={missing ? colors.amber : colors.primary}
                    bg={missing ? colors.amberBg : colors.primarySoftBg}
                  />
                  <View style={styles.flex1}>
                    <Text style={[styles.name, weight(800)]}>{d.label}</Text>
                    <Text
                      style={[
                        styles.sub,
                        d.status === 'approved' || d.status === 'pending' ? mono(12, 700) : null,
                      ]}
                      numberOfLines={1}>
                      {d.num}
                    </Text>
                  </View>
                  <StatusBadge label={pill.label} tone={pill.tone} small />
                </Pressable>
              );
            })}
          </>
        ) : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 28 },
  mb10: { marginBottom: 10 },
  flex1: { flex: 1 },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  name: { fontSize: 14.5, color: colors.ink },
  sub: { fontSize: 12, color: colors.inkMuted, marginTop: 3 },
});
