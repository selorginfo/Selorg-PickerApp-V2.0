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
import { colors, weight } from '../../theme';
import { useProfileForms } from '../../hooks/useProfileForms';
import { bankApi } from '../../services/api/bankApi';
import { ApiError } from '../../services/api/client';
import { useUI } from '../../hooks/useUI';
import { useStore } from '../../store/AppStore';
import {
  computeFieldError,
  digitsOnly,
  isBankAccount,
  isIfsc,
  normalizeIfsc,
} from '../../utils/validators';
import { pendingReviewMessage } from '../../utils/formatters';
import type { BankForm, FieldValidationOpts } from '../../types';

const BANK_SPECS: [string, FieldValidationOpts][] = [
  ['holder', { req: true, maxLen: 100 }],
  ['bank', { maxLen: 100 }],
  ['acc', { req: true, bankAcc: true }],
  ['ifsc', { req: true, ifsc: true }],
];

type CheckStatus = 'idle' | 'passed' | 'failed';
type Mode = 'view' | 'edit';

type SavedBank = {
  accountId: string;
  holder: string;
  bank: string;
  ifsc: string;
  maskedAcc: string | null;
  verified: boolean;
  rejected: boolean;
  rejectionReason: string | null;
  submittedAt: string | null;
};

export const BankDetailsScreen: React.FC = () => {
  const form = useProfileForms();
  const { dispatch } = useStore();
  const { toast } = useUI();
  const b = form.bank;

  const [mode, setMode] = useState<Mode>('edit');
  const [saved, setSaved] = useState<SavedBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accConfirm, setAccConfirm] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const draftRef = useRef<BankForm | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const accounts = await bankApi.listAccounts();
      if (!accounts.length) {
        setSaved(null);
        setMode('edit');
        form.restoreBank({ holder: '', bank: '', acc: '', ifsc: '' });
        return;
      }
      const primary = accounts.find(a => a.isPrimary) || accounts[0];
      const next: SavedBank = {
        accountId: primary.id,
        holder: primary.accountHolderName || '',
        bank: primary.bankName || '',
        ifsc: primary.ifscCode || '',
        maskedAcc: primary.accountNumberMasked || null,
        verified: primary.verificationStatus === 'verified' || primary.isVerified,
        rejected: primary.verificationStatus === 'rejected',
        rejectionReason: primary.rejectionReason || null,
        submittedAt: primary.submittedAt || null,
      };
      setSaved(next);
      form.restoreBank({
        holder: next.holder,
        bank: next.bank,
        acc: '',
        ifsc: next.ifsc,
      });
      setMode('view');
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Could not load bank accounts');
      setMode('edit');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAccounts().catch(() => undefined);
  }, [loadAccounts]);

  const accountId = saved?.accountId ?? null;
  const requireAcc = !accountId || Boolean(b.acc.trim());

  const fieldErrors = useMemo(() => {
    const out: Record<string, string> = {};
    if (!attempted && !saveAttempted) return out;
    for (const [k, opts] of BANK_SPECS) {
      if (!requireAcc && k === 'acc') continue;
      if (attempted && !saveAttempted && k !== 'acc' && k !== 'ifsc') continue;
      const val = b[k as keyof typeof b];
      out[k] = computeFieldError(val, opts);
    }
    if (saveAttempted && requireAcc) {
      if (b.acc.trim() && accConfirm.trim() && digitsOnly(b.acc) !== digitsOnly(accConfirm)) {
        out.accConfirm = 'Account numbers do not match';
      } else if (!accConfirm.trim()) {
        out.accConfirm = 'Re-enter account number to confirm';
      }
    }
    return out;
  }, [accConfirm, attempted, b, requireAcc, saveAttempted]);

  const resetCheck = useCallback(() => setCheckStatus('idle'), []);

  const startEdit = () => {
    if (!saved) {
      setMode('edit');
      return;
    }
    draftRef.current = {
      holder: saved.holder,
      bank: saved.bank,
      acc: '',
      ifsc: saved.ifsc,
    };
    form.restoreBank(draftRef.current);
    setAccConfirm('');
    setAttempted(false);
    setSaveAttempted(false);
    setCheckStatus('idle');
    setMode('edit');
  };

  const cancelEdit = () => {
    if (!saved) return;
    form.restoreBank({
      holder: saved.holder,
      bank: saved.bank,
      acc: '',
      ifsc: saved.ifsc,
    });
    setAccConfirm('');
    setAttempted(false);
    setSaveAttempted(false);
    setCheckStatus('idle');
    setMode('view');
  };

  const runFormatCheck = useCallback(async () => {
    if (checking) return;
    setAttempted(true);
    dispatch({ type: 'profile/setAttempt', section: 'bank', value: true });

    const acc = digitsOnly(b.acc);
    const ifsc = normalizeIfsc(b.ifsc);

    if (!acc || !ifsc) {
      toast('Enter account number and IFSC to check');
      setCheckStatus('failed');
      return;
    }
    if (!isBankAccount(acc) || !isIfsc(ifsc)) {
      toast('Fix the highlighted account / IFSC fields');
      setCheckStatus('failed');
      return;
    }

    setChecking(true);
    try {
      const result = await bankApi.verify({
        accountNumber: acc,
        ifsc,
        holder: b.holder.trim() || undefined,
      });
      if (result.valid) {
        setCheckStatus('passed');
        toast(
          result.holderName
            ? `Account check passed · ${result.holderName}`
            : 'Account check passed',
        );
      } else {
        setCheckStatus('failed');
        toast('Account number or IFSC looks invalid');
      }
    } catch (e) {
      setCheckStatus('failed');
      toast(e instanceof ApiError ? e.message : 'Could not verify bank details');
    } finally {
      setChecking(false);
    }
  }, [b.acc, b.holder, b.ifsc, checking, dispatch, toast]);

  const save = useCallback(async () => {
    if (saving) return;
    setAttempted(true);
    setSaveAttempted(true);
    dispatch({ type: 'profile/setAttempt', section: 'bank', value: true });

    const holder = b.holder.trim();
    const bank = b.bank.trim();
    const acc = digitsOnly(b.acc);
    const ifsc = normalizeIfsc(b.ifsc);
    const updatingWithoutAcc = Boolean(accountId) && !acc;

    if (!holder || !ifsc) {
      toast('Please fix the highlighted fields');
      return;
    }
    if (!isIfsc(ifsc)) {
      toast('Enter a valid IFSC (e.g. HDFC0001234)');
      return;
    }

    if (!updatingWithoutAcc) {
      if (!isBankAccount(acc)) {
        toast('Enter a 9–18 digit account number');
        return;
      }
      if (digitsOnly(accConfirm) !== acc) {
        toast('Account numbers do not match');
        return;
      }
    }

    setSaving(true);
    try {
      let formatOk = checkStatus === 'passed' || updatingWithoutAcc;
      if (!formatOk && acc) {
        const check = await bankApi.verify({
          accountNumber: acc,
          ifsc,
          holder: holder || undefined,
        });
        formatOk = check.valid;
        setCheckStatus(check.valid ? 'passed' : 'failed');
        if (!check.valid) {
          toast('Fix account number / IFSC before saving');
          return;
        }
      }

      if (accountId) {
        await bankApi.updateAccount(accountId, {
          holder,
          bank,
          ifsc,
          ...(acc ? { acc } : {}),
        });
      } else {
        await bankApi.addAccount({
          holder,
          bank,
          acc,
          ifsc,
        });
      }

      toast('Bank details saved');
      await loadAccounts();
      setMode('view');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save bank details');
    } finally {
      setSaving(false);
    }
  }, [
    accConfirm,
    accountId,
    b.acc,
    b.bank,
    b.holder,
    b.ifsc,
    checkStatus,
    dispatch,
    loadAccounts,
    saving,
    toast,
  ]);

  const bannerTone = saved?.verified
    ? 'success'
    : checkStatus === 'failed' || saved?.rejected
      ? 'danger'
      : 'pending';
  const bannerMsg = saved?.verified
    ? 'Verified · payouts go to this account'
    : checkStatus === 'passed'
      ? 'Format check passed · you can save these details'
      : checkStatus === 'failed'
        ? 'Check failed · fix account number or IFSC'
        : saved?.rejected
          ? saved.rejectionReason
            ? `Rejected · ${saved.rejectionReason}`
            : 'Rejected · edit your details and submit again'
          : saved
            ? pendingReviewMessage(saved.submittedAt)
            : 'Add your bank account for withdrawals';

  return (
    <Screen scroll keyboard={mode === 'edit'} edges={['top', 'bottom']}>
      <AppHeader title="Bank account" />
      <View style={styles.body}>
        {loading ? (
          <Text style={styles.loading}>Loading…</Text>
        ) : loadError ? (
          <ErrorState
            title="Couldn't load bank details"
            message={loadError}
            onRetry={() => {
              loadAccounts().catch(() => undefined);
            }}
          />
        ) : (
          <>
            <SavedSuccessBanner message={bannerMsg} tone={bannerTone} />

            {mode === 'view' && saved ? (
              <>
                <ReadonlyField label="Account holder name" value={saved.holder} />
                <ReadonlyField label="Bank name" value={saved.bank} />
                <ReadonlyField
                  label="Account number"
                  value={saved.maskedAcc || '••••••••'}
                />
                <ReadonlyField label="IFSC code" value={saved.ifsc} />
                <PrimaryButton label="Edit bank details" onPress={startEdit} />
              </>
            ) : (
              <>
                <TextField
                  label="Account holder name"
                  value={b.holder}
                  onChangeText={t => {
                    resetCheck();
                    form.setField('bank', 'holder', t);
                  }}
                  placeholder="As per bank records"
                  autoCapitalize="words"
                  error={fieldErrors.holder}
                />
                <TextField
                  label="Bank name (optional)"
                  value={b.bank}
                  onChangeText={t => {
                    resetCheck();
                    form.setField('bank', 'bank', t);
                  }}
                  placeholder="e.g. HDFC Bank"
                  error={fieldErrors.bank}
                />
                <TextField
                  label="Account number"
                  value={b.acc}
                  onChangeText={t => {
                    resetCheck();
                    form.setField('bank', 'acc', digitsOnly(t, 18));
                  }}
                  keyboardType="number-pad"
                  maxLength={18}
                  error={fieldErrors.acc}
                  placeholder={saved?.maskedAcc ? `Current · ${saved.maskedAcc}` : '9–18 digit account number'}
                  hint={accountId && !b.acc ? 'Re-enter full account number to verify or change it' : undefined}
                />
                <TextField
                  label="Confirm account number"
                  value={accConfirm}
                  onChangeText={t => {
                    resetCheck();
                    setAccConfirm(digitsOnly(t, 18));
                  }}
                  keyboardType="number-pad"
                  maxLength={18}
                  error={fieldErrors.accConfirm}
                  placeholder="Re-enter account number"
                />
                <TextField
                  label="IFSC code"
                  value={b.ifsc}
                  onChangeText={t => {
                    resetCheck();
                    form.setField('bank', 'ifsc', normalizeIfsc(t));
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={11}
                  error={fieldErrors.ifsc}
                  placeholder="e.g. HDFC0001234"
                  hint="11 characters · 5th character must be 0"
                />

                <PrimaryButton
                  label={checking ? 'Checking…' : 'Check account'}
                  onPress={() => {
                    runFormatCheck().catch(() => undefined);
                  }}
                  height={48}
                  fontSize={14}
                  loading={checking}
                  disabled={checking || saving}
                  style={styles.checkBtn}
                />
                <PrimaryButton
                  label={saving ? 'Saving…' : 'Save bank details'}
                  onPress={() => {
                    save().catch(() => undefined);
                  }}
                  style={styles.saveBtn}
                  loading={saving}
                  disabled={saving || checking}
                />
                {saved ? (
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
  loading: { textAlign: 'center', color: colors.inkMuted, marginTop: 24, ...weight(600) },
  checkBtn: { marginTop: 4, marginBottom: 10, backgroundColor: colors.inkGreen },
  saveBtn: { marginTop: 4 },
  cancel: { marginTop: 12 },
});
