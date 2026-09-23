import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, weight, shadows } from '../../../theme';
import { TextField } from '../../../components/inputs/TextField';
import { SavedSuccessBanner } from '../../../components/common/SavedSuccessBanner';
import { ReadonlyField } from '../../../components/common/ReadonlyField';
import { useOnboarding } from '../../../hooks/useOnboarding';
import { digitsOnly, normalizeIfsc } from '../../../utils/validators';

export const Step8Bank: React.FC = () => {
  const ob = useOnboarding();
  const errs = ob.errorsFor('obBank');

  if (ob.bankSaved) {
    return (
      <View style={styles.card}>
        <SavedSuccessBanner message="Bank account saved · you can edit it anytime from Payouts" />
        <Text style={[styles.title, weight(800)]}>You're all set</Text>
        <Text style={styles.sub}>Tap Enter app to start picking. Bank details stay on your payouts screen.</Text>
        <ReadonlyField label="Account holder" value={ob.bank.holder} />
        <ReadonlyField label="Bank name" value={ob.bank.bank} />
        <ReadonlyField label="Account number" value={ob.bank.acc} />
        <ReadonlyField label="IFSC" value={ob.bank.ifsc} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={[styles.title, weight(800)]}>Bank account</Text>
      <Text style={styles.sub}>Your monthly payouts are sent here.</Text>
      <TextField
        label="Account holder name"
        value={ob.bank.holder}
        onChangeText={t => ob.setField('obBank', 'holder', t)}
        placeholder="As per bank records"
        error={errs.holder}
      />
      <TextField
        label="Bank name (optional)"
        value={ob.bank.bank}
        onChangeText={t => ob.setField('obBank', 'bank', t)}
        placeholder="e.g. HDFC Bank"
        error={errs.bank}
      />
      <TextField
        label="Account number"
        value={ob.bank.acc}
        onChangeText={t => ob.setField('obBank', 'acc', digitsOnly(t, 18))}
        keyboardType="number-pad"
        maxLength={18}
        placeholder="9–18 digit account number"
        error={errs.acc}
      />
      <TextField
        label="IFSC code"
        value={ob.bank.ifsc}
        onChangeText={t => ob.setField('obBank', 'ifsc', normalizeIfsc(t))}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={11}
        placeholder="e.g. HDFC0001234"
        error={errs.ifsc}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 20,
    ...shadows.card,
  },
  title: { fontSize: 15, marginBottom: 2 },
  sub: { fontSize: 12.5, color: colors.inkSecondary, marginBottom: 18, lineHeight: 19 },
});
