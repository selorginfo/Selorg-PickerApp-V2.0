import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MainStackNavigation, MainStackParamList } from '../../navigation/navigationTypes';
import { Screen } from '../../components/common/Screen';
import { Icon } from '../../components/icons/Icon';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { BottomSheet } from '../../components/bottomSheets/BottomSheet';
import { colors, radius, weight, shadows } from '../../theme';
import { useUI } from '../../hooks/useUI';
import { DOC_LIST, TWO_SIDED_DOC_CODES } from '../../mock/documents';
import { profileApi } from '../../services/api/profileApi';
import { pickDocumentImage } from '../../services/media/pickDocumentImage';
import { ApiError } from '../../services/api/client';
import { normalizeKycDocType } from '../../services/api/mappers';
import type { DocumentDto, KycDocumentSide, KycDocumentType } from '../../types/api';

type SlotSide = KycDocumentSide | 'file';
type DocUiStatus = 'missing' | 'partial' | 'pending' | 'approved' | 'rejected';

const TWO_SIDED = new Set<string>(TWO_SIDED_DOC_CODES);

const ui = {
  dropBg: '#FEFBF0',
  dropBorder: '#E8D9B8',
  accent: '#A67C00',
  accentSoft: '#C4A035',
  success: '#2E7D32',
  pdfRed: '#D32F2F',
  pdfBg: '#FBE9E7',
  cardBorder: '#E6E6E6',
  ink: '#1A1A1A',
  muted: '#757575',
  hair: '#EEEEEE',
};

function isTwoSided(code: string): boolean {
  return TWO_SIDED.has(code);
}

function slotKey(code: string, side: SlotSide): string {
  return `${code}:${side}`;
}

function findDocRow(docs: DocumentDto[], code: string, side: SlotSide): DocumentDto | undefined {
  const rows = docs.filter(d => normalizeKycDocType(d.type) === normalizeKycDocType(code));
  if (side === 'file') return rows[0];
  return rows.find(d => d.side === side) || (side === 'front' ? rows.find(d => !d.side) : undefined);
}

function mapStatus(raw: string | undefined, partial: boolean): DocUiStatus {
  const s = (raw || 'missing').toLowerCase();
  if (s === 'approved' || s === 'verified') return 'approved';
  if (s === 'pending') return 'pending';
  if (s === 'rejected') return 'rejected';
  if (partial) return 'partial';
  return 'missing';
}

function sideLabel(side: SlotSide): string {
  if (side === 'front') return 'Front';
  if (side === 'back') return 'Back';
  return 'Document';
}

function formatUploadedAt(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${d.getDate()} ${months[d.getMonth()]} ${h}:${m} ${ampm}`;
}

type FileRow = {
  key: string;
  side: SlotSide;
  title: string;
  uri?: string;
  status: DocUiStatus;
  approved: boolean;
  meta: string;
  fileName?: string;
};

const UploadProgressBar: React.FC<{ active: boolean }> = ({ active }) => {
  const width = useRef(new Animated.Value(0.12)).current;

  useEffect(() => {
    if (!active) {
      width.setValue(0.12);
      return;
    }
    width.setValue(0.12);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(width, { toValue: 0.78, duration: 1100, useNativeDriver: false }),
        Animated.timing(width, { toValue: 0.28, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, width]);

  if (!active) return null;

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: width.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

export const UploadDocumentScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigation>();
  const route = useRoute<RouteProp<MainStackParamList, 'UploadDocument'>>();
  const { toast } = useUI();

  const docType = route.params.type;
  const docDef = DOC_LIST.find(d => d.code === docType);
  const label = docDef?.label || 'Document';
  const twoSided = isTwoSided(docType);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocumentDto[]>([]);
  const [slotUris, setSlotUris] = useState<Record<string, string>>({});
  const [docStatus, setDocStatus] = useState<DocUiStatus>('missing');
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ uri: string; title: string } | null>(null);
  const [sidePickerOpen, setSidePickerOpen] = useState(false);

  const slots: SlotSide[] = useMemo(
    () => (twoSided ? (['front', 'back'] as SlotSide[]) : (['file'] as SlotSide[])),
    [twoSided],
  );

  const syncFromServer = useCallback(async () => {
    setError(null);
    try {
      const uploaded = await profileApi.listKycDocuments();
      const nextUris: Record<string, string> = {};

      for (const side of slots) {
        const row = findDocRow(uploaded, docType, side);
        if (row?.url) nextUris[slotKey(docType, side)] = row.url;
      }

      let status: DocUiStatus = 'missing';
      if (twoSided) {
        const hasFront = Boolean(nextUris[slotKey(docType, 'front')]);
        const hasBack = Boolean(nextUris[slotKey(docType, 'back')]);
        const partial = hasFront !== hasBack;
        const frontRow = findDocRow(uploaded, docType, 'front');
        const backRow = findDocRow(uploaded, docType, 'back');
        const raw =
          frontRow?.status === 'rejected' || backRow?.status === 'rejected'
            ? 'rejected'
            : frontRow?.status || backRow?.status;
        status = mapStatus(raw, partial);
      } else {
        const row = findDocRow(uploaded, docType, 'file');
        status = mapStatus(row?.status, false);
      }

      setDocs(uploaded);
      setSlotUris(nextUris);
      setDocStatus(status);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load documents");
    } finally {
      setLoading(false);
    }
  }, [docType, slots, twoSided]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void syncFromServer();
    }, [syncFromServer]),
  );

  const rows: FileRow[] = useMemo(() => {
    return slots.map(side => {
      const key = slotKey(docType, side);
      const uri = slotUris[key];
      const row = findDocRow(docs, docType, side);
      const when = formatUploadedAt(row?.uploadedAt || row?.createdAt);
      const title = twoSided ? `${label} · ${sideLabel(side)}` : label;
      let meta = twoSided ? `${sideLabel(side)} photo` : docDef?.sub || 'Document photo';
      if (uri) {
        meta = when || (docStatus === 'approved' ? 'Verified' : docStatus === 'rejected' ? 'Rejected' : 'Uploaded');
      }
      return {
        key,
        side,
        title,
        uri,
        status: docStatus,
        approved: docStatus === 'approved',
        meta,
        fileName: row?.fileName,
      };
    });
  }, [docDef?.sub, docStatus, docType, docs, label, slotUris, slots, twoSided]);

  const visibleRows = useMemo(
    () => rows.filter(r => r.uri || uploadingSlot === r.key),
    [rows, uploadingSlot],
  );

  const onUpload = async (side: SlotSide) => {
    if (uploadingSlot || docStatus === 'approved') return;

    const hint = side === 'front' ? ' (front)' : side === 'back' ? ' (back)' : '';
    const picked = await pickDocumentImage(`Upload ${label}${hint}`);
    if (!picked) return;

    const key = slotKey(docType, side);
    const previousUri = slotUris[key];
    setUploadingSlot(key);
    setError(null);
    setSlotUris(prev => ({ ...prev, [key]: picked.uri }));

    const restorePrevious = () => {
      setSlotUris(prev => {
        const next = { ...prev };
        if (previousUri) next[key] = previousUri;
        else delete next[key];
        return next;
      });
    };

    try {
      const result = await profileApi.uploadKycDocument(docType, picked.uri, {
        side: side === 'file' ? undefined : side,
        fileName: picked.fileName,
        mimeType: picked.mimeType || 'image/jpeg',
        base64: picked.base64,
      });
      if (result?.url) {
        setSlotUris(prev => ({ ...prev, [key]: result.url as string }));
      }
      toast(`${label}${hint} uploaded`);
      await syncFromServer();
    } catch (e) {
      restorePrevious();
      const msg = e instanceof ApiError ? e.message : 'Upload failed. Please try again.';
      setError(msg);
      toast(msg);
    } finally {
      setUploadingSlot(null);
    }
  };

  const openBrowse = () => {
    if (uploadingSlot || docStatus === 'approved') {
      if (docStatus === 'approved') toast('This document is already verified');
      return;
    }
    if (twoSided) {
      setSidePickerOpen(true);
      return;
    }
    void onUpload('file');
  };

  const onReplace = (row: FileRow) => {
    if (row.approved) {
      toast('Verified documents cannot be removed');
      return;
    }
    Alert.alert(row.title, 'Replace this file with a new upload?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        onPress: () => {
          void onUpload(row.side);
        },
      },
    ]);
  };

  return (
    <Screen scroll edges={['top']} background={colors.white}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="upload" size={20} color={ui.accent} strokeWidth={2.2} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, weight(800)]}>Upload Files</Text>
          <Text style={styles.headerSub}>Select and upload the files of your choice</Text>
        </View>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close">
          <Icon name="close" size={20} color={ui.ink} strokeWidth={2.2} />
        </Pressable>
      </View>
      <View style={styles.headerRule} />

      <View style={styles.body}>
        <Text style={[styles.docLabel, weight(700)]}>{label}</Text>
        <Text style={styles.docHint}>
          {twoSided ? 'Front and back photos required' : 'Front photo only'} · JPEG / PNG up to 10 MB
        </Text>

        {loading && !Object.keys(slotUris).length ? (
          <Skeleton height={180} radius={16} style={styles.mb14} />
        ) : null}

        {error && loading === false && !Object.keys(slotUris).length ? (
          <ErrorState
            title="Couldn't load document"
            message={error}
            onRetry={() => {
              setLoading(true);
              void syncFromServer();
            }}
          />
        ) : null}

        {!!error && Object.keys(slotUris).length > 0 ? (
          <Text style={styles.inlineError}>{error}</Text>
        ) : null}

        {!loading || Object.keys(slotUris).length > 0 ? (
          <>
            <Pressable
              style={styles.dropzone}
              onPress={openBrowse}
              disabled={!!uploadingSlot || docStatus === 'approved'}
              accessibilityRole="button"
              accessibilityLabel="Browse file">
              <View style={styles.dropIconWrap}>
                <Icon name="file" size={28} color={ui.accent} strokeWidth={1.8} />
                <View style={styles.dropIconBadge}>
                  <Icon name="upload" size={12} color={colors.white} strokeWidth={2.4} />
                </View>
              </View>
              <Text style={[styles.dropTitle, weight(700)]}>Choose a file or document</Text>
              <Text style={styles.dropHint}>JPEG, PNG, and PDF up to 50 MB.</Text>
              <Pressable
                style={[
                  styles.browseBtn,
                  uploadingSlot || docStatus === 'approved' ? styles.browseBtnDisabled : null,
                ]}
                onPress={openBrowse}
                disabled={!!uploadingSlot || docStatus === 'approved'}>
                <Text style={[styles.browseLabel, weight(600)]}>Browse File</Text>
              </Pressable>
            </Pressable>

            {visibleRows.length > 0 ? (
              <View style={styles.listSheet}>
                <View style={styles.sheetHandle} />
                {visibleRows.map(row => {
                  const uploading = uploadingSlot === row.key;
                  const completed =
                    !uploading && !!row.uri && (row.status === 'pending' || row.status === 'approved');

                  return (
                    <View key={row.key} style={styles.fileCard}>
                      <View style={styles.fileRow}>
                        <Pressable
                          onPress={() => {
                            if (row.uri) setPreview({ uri: row.uri, title: row.title });
                          }}
                          style={styles.fileIconWrap}>
                          {row.uri && !uploading ? (
                            <Image source={{ uri: row.uri }} style={styles.fileThumb} resizeMode="cover" />
                          ) : (
                            <View style={styles.pdfBadge}>
                              <Text style={[styles.pdfBadgeText, weight(800)]}>DOC</Text>
                            </View>
                          )}
                        </Pressable>

                        <View style={styles.fileMeta}>
                          <Text style={[styles.fileName, weight(700)]} numberOfLines={1}>
                            {row.fileName || row.title}
                          </Text>
                          <View style={styles.fileStatusRow}>
                            <Text style={styles.fileSize} numberOfLines={1}>
                              {row.meta}
                            </Text>
                            {completed ? (
                              <View style={styles.completedPill}>
                                <View style={styles.checkCircle}>
                                  <Icon name="check" size={10} color={colors.white} strokeWidth={3} />
                                </View>
                                <Text style={[styles.completedText, weight(600)]}>
                                  {row.approved ? 'Verified' : 'Completed'}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        {uploading ? (
                          <ActivityIndicator color={ui.accent} size="small" style={styles.rowAction} />
                        ) : (
                          <Pressable
                            onPress={() => onReplace(row)}
                            hitSlop={8}
                            style={styles.rowAction}
                            accessibilityLabel="Replace file">
                            <Icon name="close" size={18} color={ui.muted} strokeWidth={2.2} />
                          </Pressable>
                        )}
                      </View>
                      <UploadProgressBar active={uploading} />
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyHint}>No files uploaded yet. Tap Browse File to get started.</Text>
            )}

            {twoSided
              ? rows
                  .filter(r => !r.uri && uploadingSlot !== r.key)
                  .map(r => (
                    <Pressable
                      key={`need-${r.key}`}
                      style={styles.requiredRow}
                      onPress={() => void onUpload(r.side)}
                      disabled={!!uploadingSlot || docStatus === 'approved'}>
                      <View style={styles.requiredIcon}>
                        <Icon name="file" size={18} color={ui.muted} strokeWidth={2} />
                      </View>
                      <View style={styles.flex1}>
                        <Text style={[styles.requiredName, weight(600)]}>{r.title}</Text>
                        <Text style={styles.requiredSub}>Still needed</Text>
                      </View>
                      <Text style={[styles.requiredCta, weight(700)]}>Upload</Text>
                    </Pressable>
                  ))
              : null}
          </>
        ) : null}
      </View>

      <BottomSheet visible={sidePickerOpen} onClose={() => setSidePickerOpen(false)}>
        <Text style={[styles.sheetTitle, weight(800)]}>Browse File</Text>
        <Text style={styles.sheetSub}>Which side of {label} are you uploading?</Text>
        {slots.map(side => (
          <Pressable
            key={`side-${side}`}
            style={styles.browseOption}
            onPress={() => {
              setSidePickerOpen(false);
              void onUpload(side);
            }}>
            <View style={styles.browseOptionIcon}>
              <Icon name="file" size={18} color={ui.accent} strokeWidth={2} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.browseOptionTitle, weight(700)]}>
                {label} · {sideLabel(side)}
              </Text>
              <Text style={styles.browseOptionSub}>
                {slotUris[slotKey(docType, side)] ? 'Replace existing file' : 'Upload new photo'}
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={ui.muted} />
          </Pressable>
        ))}
      </BottomSheet>

      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}>
        <SafeAreaView style={styles.previewRoot} edges={['top', 'bottom']}>
          <Pressable style={styles.previewClose} onPress={() => setPreview(null)} hitSlop={8}>
            <Text style={styles.previewCloseText}>Close</Text>
          </Pressable>
          {preview ? (
            <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
          {preview ? <Text style={styles.previewTitle}>{preview.title}</Text> : null}
        </SafeAreaView>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.dropBg,
    borderWidth: 1,
    borderColor: ui.dropBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, paddingTop: 2 },
  headerTitle: { fontSize: 22, color: ui.ink, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: ui.muted, marginTop: 3, lineHeight: 18 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRule: { height: StyleSheet.hairlineWidth, backgroundColor: ui.hair, marginHorizontal: 20 },
  body: { padding: 20, paddingBottom: 36 },
  docLabel: { fontSize: 16, color: ui.ink, marginBottom: 4 },
  docHint: { fontSize: 12.5, color: ui.muted, marginBottom: 16, lineHeight: 18 },
  mb14: { marginBottom: 14 },
  flex1: { flex: 1 },
  inlineError: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
    marginBottom: 12,
  },
  dropzone: {
    backgroundColor: ui.dropBg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: ui.dropBorder,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  dropIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: ui.dropBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dropIconBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ui.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropTitle: { fontSize: 15, color: ui.ink, textAlign: 'center' },
  dropHint: { fontSize: 12.5, color: ui.muted, marginTop: 6, textAlign: 'center' },
  browseBtn: {
    marginTop: 18,
    minHeight: 42,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseBtnDisabled: { opacity: 0.55 },
  browseLabel: { fontSize: 14, color: '#555555' },
  emptyHint: {
    fontSize: 13,
    color: ui.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 19,
  },
  listSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    marginBottom: 18,
    ...shadows.card,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8D8D8',
    marginBottom: 12,
  },
  fileCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 10,
  },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIconWrap: {
    width: 44,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: ui.pdfBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileThumb: { width: '100%', height: '100%' },
  pdfBadge: {
    width: 34,
    height: 40,
    borderRadius: 6,
    backgroundColor: ui.pdfRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBadgeText: { color: colors.white, fontSize: 9, letterSpacing: 0.4 },
  fileMeta: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 14, color: ui.ink },
  fileStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  fileSize: { fontSize: 12, color: ui.muted, flexShrink: 1 },
  completedPill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  checkCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ui.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: { fontSize: 12, color: ui.success },
  rowAction: { padding: 4 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EFEFEF',
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: ui.accentSoft,
  },
  requiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  requiredIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requiredName: { fontSize: 14, color: ui.ink },
  requiredSub: { fontSize: 12, color: ui.muted, marginTop: 2 },
  requiredCta: { fontSize: 13, color: colors.primary },
  sheetTitle: { fontSize: 18, color: ui.ink, marginBottom: 4 },
  sheetSub: { fontSize: 13, color: ui.muted, marginBottom: 16 },
  browseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ui.hair,
  },
  browseOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ui.dropBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseOptionTitle: { fontSize: 14, color: ui.ink },
  browseOptionSub: { fontSize: 12, color: ui.muted, marginTop: 2 },
  previewRoot: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 48,
  },
  previewClose: {
    position: 'absolute',
    top: 12,
    right: 20,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.round,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  previewCloseText: { fontWeight: '700', fontSize: 13, color: colors.white },
  previewImage: { width: '100%', height: '78%' },
  previewTitle: {
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
    color: colors.white,
  },
});
