import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../components/bottomSheets/BottomSheet';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { SavedSuccessBanner } from '../components/common/SavedSuccessBanner';
import { colors, weight, fontFamily } from '../theme';
import { useWallet } from '../hooks/useWallet';

export const WithdrawSheet: React.FC = () => {
  const wallet = useWallet();
  const min = wallet.minWithdrawal ?? 100;
  const hasBank = Boolean(wallet.bankLabel);
  const amt = parseInt(wallet.wdAmount, 10) || 0;
  const [receipt, setReceipt] = useState<{ amount: number; status: string } | null>(null);

  const amountError = useMemo(() => {
    if (!wallet.wdAmount.trim()) return '';
    if (amt < min) return `Minimum withdrawal is ₹${min}`;
    if (amt > wallet.available) return 'Amount exceeds available balance';
    return '';
  }, [wallet.wdAmount, amt, min, wallet.available]);

  const amountOk = amt >= min && amt <= wallet.available;
  const canConfirm = hasBank && amountOk && !wallet.withdrawing;
  const visible = wallet.wdSheet || Boolean(receipt);

  const close = () => {
    setReceipt(null);
    wallet.closeWithdraw();
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      {receipt ? (
        <View>
          <SavedSuccessBanner
            message={`Withdrawal ${receipt.status} · ₹${receipt.amount}`}
            tone="pending"
          />
          <Text style={[styles.title, weight(800)]}>Request submitted</Text>
          <Text style={styles.sub}>
            To {wallet.bankLabel || 'your bank'}. We will notify you as the payout is reviewed.
          </Text>
          <PrimaryButton label="Done" onPress={close} height={54} fontSize={15} />
        </View>
      ) : (
        <>
          <Text style={[styles.title, weight(800)]}>Withdraw earnings</Text>
          <Text style={styles.sub}>
            Available balance:{' '}
            <Text style={[weight(700), { color: colors.ink }]}>{wallet.availableLabel}</Text>
          </Text>

          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={[styles.input, amountError ? styles.inputError : null]}
            value={wallet.wdAmount}
            onChangeText={wallet.setAmount}
            keyboardType="number-pad"
            placeholder={`Min ₹${min}`}
            placeholderTextColor={colors.inkMuted}
            editable={!wallet.withdrawing}
          />
          {amountError ? <Text style={styles.fieldError}>{amountError}</Text> : null}

          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>To bank account</Text>
            <Text style={[styles.bankValue, weight(800)]}>
              {wallet.bankLabel || 'Add a bank account'}
            </Text>
          </View>
          {!hasBank ? (
            <Text style={styles.warn}>Add and verify a bank account before withdrawing.</Text>
          ) : !wallet.bankVerified ? (
            <Text style={styles.note}>
              Bank verification is pending. You can still request a withdrawal; payouts process after review.
            </Text>
          ) : (
            <Text style={styles.note}>
              Withdrawals are reviewed and paid per the payout schedule. Status: Pending → Approved → Paid.
            </Text>
          )}

          <PrimaryButton
            label={wallet.withdrawing ? 'Submitting…' : 'Confirm withdrawal'}
            onPress={() => {
              wallet
                .submitWithdraw()
                .then(result => {
                  if (result) setReceipt({ amount: result.amount, status: result.status });
                })
                .catch(() => undefined);
            }}
            height={54}
            fontSize={15}
            loading={wallet.withdrawing}
            disabled={!canConfirm}
          />
          <Pressable style={styles.cancel} onPress={close} disabled={wallet.withdrawing}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 19, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.inkSecondary, marginBottom: 20 },
  label: { fontSize: 12, ...weight(600), color: colors.inkSecondary, marginBottom: 6 },
  input: {
    height: 54,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    fontFamily: fontFamily.mono,
    marginBottom: 6,
  },
  inputError: { borderColor: colors.inputBorderError },
  fieldError: { fontSize: 11.5, color: colors.danger, marginBottom: 10, ...weight(600) },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutralGreenBg3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  bankLabel: { fontSize: 13, color: colors.inkSecondary },
  bankValue: { fontSize: 13 },
  note: { fontSize: 11.5, color: colors.inkMuted, lineHeight: 17, marginBottom: 18 },
  warn: { fontSize: 11.5, color: colors.amberText, lineHeight: 17, marginBottom: 18 },
  cancel: { paddingVertical: 12, marginTop: 4, alignItems: 'center' },
  cancelText: { color: colors.inkMuted, fontSize: 13.5, ...weight(600) },
});
