import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, weight } from '../../theme';
import { useUI } from '../../hooks/useUI';

/** Amber "Offline — 3 actions queued…" strip (dataState === 'offline'). */
export const OfflineBanner: React.FC = () => {
  const { dataState } = useUI();
  if (dataState !== 'offline') return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.dot} />
      <Text style={[styles.text, weight(700)]}>Offline — 3 actions queued, will sync when back online</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.amber,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.amberInk },
  text: { color: colors.amberInk, fontSize: 12, textAlign: 'center' },
});
