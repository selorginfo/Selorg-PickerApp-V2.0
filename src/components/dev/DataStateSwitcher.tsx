import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, weight } from '../../theme';
import { useUI } from '../../hooks/useUI';
import type { DataState } from '../../types';

const ORDER: DataState[] = ['normal', 'loading', 'empty', 'error', 'offline'];

/**
 * __DEV__-only helper to preview the loading / empty / error / offline variants
 * that the source design defines (dataState). Not shipped in release builds.
 */
export const DataStateSwitcher: React.FC = () => {
  const { dataState, setDataState } = useUI();
  const [open, setOpen] = useState(false);
  if (!__DEV__) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {open &&
        ORDER.map(s => (
          <Pressable
            key={s}
            style={[styles.chip, dataState === s && styles.chipActive]}
            onPress={() => setDataState(s)}>
            <Text style={[styles.chipText, weight(700), dataState === s && styles.chipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      <Pressable style={styles.fab} onPress={() => setOpen(o => !o)}>
        <Text style={styles.fabText}>{open ? '×' : 'DS'}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 10, bottom: 120, alignItems: 'flex-end', gap: 6, zIndex: 200 },
  fab: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', opacity: 0.85 },
  fabText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11, color: colors.inkSecondary },
  chipTextActive: { color: colors.white },
});
