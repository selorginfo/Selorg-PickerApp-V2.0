import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { TextField } from '../../components/inputs/TextField';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { OutlineButton } from '../../components/buttons/OutlineButton';
import { SavedSuccessBanner } from '../../components/common/SavedSuccessBanner';
import { ReadonlyField } from '../../components/common/ReadonlyField';
import { ErrorState } from '../../components/feedback/ErrorState';
import { colors } from '../../theme';
import { useUI } from '../../hooks/useUI';
import { profileApi } from '../../services/api/profileApi';
import { ApiError } from '../../services/api/client';
import { computeFieldError } from '../../utils/validators';
import { pendingReviewMessage } from '../../utils/formatters';

type UpiStatus = 'none' | 'pending' | 'verified' | 'rejected';
type Mode = 'view' | 'edit';

export const UpiDetailsScreen: React.FC = () => {
  const { toast } = useUI();
  const [upi, setUpi] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savedUpi, setSavedUpi] = useState('');
  const [status, setStatus] = useState<UpiStatus>('none');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [mode, setMode] = useState<Mode>('edit');
  const busy = useRef(false);
  const draftSnap = useRef<{ upi: string; confirm: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const p = await profileApi.getProfile();
      const id = p?.upiId || '';
      const s = (p?.upiPayoutVerificationStatus || 'none') as UpiStatus;
      setSavedUpi(id);
      setUpi(id);
      setConfirm(id);
      setStatus(s);
      setRejectionReason(p?.upiPayoutRejectionReason || null);
      setSubmittedAt(p?.upiPayoutSubmittedAt || null);
      setMode(id ? 'view' : 'edit');
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Could not load UPI details');
      setMode('edit');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const errors = useMemo(() => {
    if (!attempted) return { upi: '', confirm: '' };
    const upiErr = computeFieldError(upi, { req: true, upi: true });
    let confirmErr = '';
    if (!confirm.trim()) confirmErr = 'This field is required';
    else if (upi.trim() !== confirm.trim()) confirmErr = 'UPI IDs must match';
    return { upi: upiErr, confirm: confirmErr };
  }, [attempted, upi, confirm]);

  const startEdit = () => {
    draftSnap.current = { upi: savedUpi, confirm: savedUpi };
    setUpi(savedUpi);
    setConfirm(savedUpi);
    setAttempted(false);
    setMode('edit');
  };

  const cancelEdit = () => {
    setUpi(savedUpi);
    setConfirm(savedUpi);
    setAttempted(false);
    setMode('view');
  };

  const save = async () => {
    if (busy.current) return;
    setAttempted(true);
    const upiErr = computeFieldError(upi, { req: true, upi: true });
    if (upiErr) {
      toast(upiErr);
      return;
    }
    if (!confirm.trim() || upi.trim() !== confirm.trim()) {
      toast('UPI IDs must match');
      return;
    }
    busy.current = true;
    setSaving(true);
    try {
      const res = await profileApi.setUpi(upi.trim());
      const next = (res?.upiPayoutVerificationStatus || 'pending') as UpiStatus;
      const saved = res?.upiId || upi.trim();
      setSavedUpi(saved);
      setUpi(saved);
      setConfirm(saved);
      setStatus(next);
      setRejectionReason(res?.upiPayoutRejectionReason || null);
      setSubmittedAt(res?.upiPayoutSubmittedAt || new Date().toISOString());
      setMode('view');
      toast('UPI submitted for verification');
    } catch (e) {
      // Keep previous savedUpi / view data intact; stay in edit with entered values
      toast(e instanceof ApiError ? e.message : 'Could not save UPI');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const verified = status === 'verified';
  const pending = status === 'pending';
  const rejected = status === 'rejected';

  const bannerTone = verified ? 'success' : rejected ? 'danger' : 'pending';
  const bannerMsg = verified
    ? 'Verified · faster payouts enabled'
    : pending
      ? pendingReviewMessage(submittedAt)
      : rejected
        ? rejectionReason
          ? `UPI rejected · ${rejectionReason}`
          : 'UPI rejected · edit and submit a different ID'
        : 'Add a UPI ID to receive faster payouts';

  return (
    <Screen scroll keyboard={mode === 'edit'} edges={['top', 'bottom']}>
      <AppHeader title="UPI details" />
      <View style={styles.body}>
        {loading ? (
          <Text style={styles.loading}>Loading…</Text>
        ) : loadError ? (
          <ErrorState
            title="Couldn't load UPI details"
            message={loadError}
            onRetry={() => {
              load().catch(() => undefined);
            }}
          />
        ) : (
          <>
            <SavedSuccessBanner
              message={mode === 'view' && savedUpi ? `${bannerMsg}` : bannerMsg}
              tone={bannerTone}
            />

            {mode === 'view' && savedUpi ? (
              <>
                <ReadonlyField label="UPI ID" value={savedUpi} />
                <PrimaryButton label="Edit UPI" onPress={startEdit} height={52} fontSize={15} />
              </>
            ) : (
              <>
                <TextField
                  label="UPI ID"
                  value={upi}
                  onChangeText={setUpi}
                  placeholder="yourname@upi"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.upi}
                />
                <TextField
                  label="Confirm UPI ID"
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Re-enter UPI ID"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.confirm}
                />
                <PrimaryButton
                  label={saving ? 'Saving…' : 'Verify & save UPI'}
                  onPress={() => {
                    save().catch(() => undefined);
                  }}
                  height={52}
                  fontSize={15}
                  style={styles.saveBtn}
                  disabled={saving}
                  loading={saving}
                />
                {savedUpi ? (
                  <OutlineButton
                    label="Cancel"
                    onPress={cancelEdit}
                    color={colors.inkMuted}
                    style={styles.cancel}
                  />
                ) : null}
              </>
            )}
          </>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 28 },
  loading: { textAlign: 'center', color: colors.inkMuted, marginTop: 24 },
  saveBtn: { marginTop: 6 },
  cancel: { marginTop: 12 },
});
