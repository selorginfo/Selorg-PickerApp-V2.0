import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, weight, shadows } from '../../theme';
import { Icon } from '../icons/Icon';
import { PrimaryButton } from '../buttons/PrimaryButton';

interface Props {
  title?: string;
  message?: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<Props> = ({
  title = "Couldn't load dashboard",
  message = 'Check your connection and try again.',
  onRetry,
}) => (
  <View style={styles.card}>
    <View style={styles.circle}>
      <Icon name="alert" size={32} color={colors.danger} strokeWidth={2} />
    </View>
    <Text style={[styles.title, weight(800)]}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    <PrimaryButton label="Retry" onPress={onRetry} height={48} fontSize={14} style={styles.btn} />
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerBorder2,
    borderRadius: 18,
    padding: 36,
    alignItems: 'center',
    marginTop: 40,
    ...shadows.card,
  },
  circle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 17, marginBottom: 6, color: colors.ink },
  message: { fontSize: 13.5, color: colors.inkSecondary, marginBottom: 20, textAlign: 'center' },
  btn: { width: 'auto', paddingHorizontal: 28 },
});
