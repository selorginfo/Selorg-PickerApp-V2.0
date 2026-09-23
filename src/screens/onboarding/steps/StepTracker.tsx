import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, weight } from '../../../theme';
import { Icon } from '../../../components/icons/Icon';

const NODES = ['Profile', 'Work', 'KYC', 'Bank'];

/** 4-node tracker. `phase` 1..4 from useOnboarding(). */
export const StepTracker: React.FC<{ phase: number }> = ({ phase }) => (
  <View style={styles.row}>
    {NODES.map((label, i) => {
      const node = i + 1;
      const done = node < phase;
      const current = node === phase;
      const active = done || current;
      return (
        <View key={label} style={styles.node}>
          <View
            style={[
              styles.dot,
              { backgroundColor: active ? colors.primary : colors.neutralGreenBg, borderWidth: current ? 3 : 0, borderColor: '#C6E6CF' },
            ]}>
            {done ? (
              <Icon name="check" size={13} color={colors.white} strokeWidth={3} />
            ) : (
              <Text style={[styles.num, weight(800), { color: active ? colors.white : colors.inkMuted2 }]}>{node}</Text>
            )}
          </View>
          <Text
            style={[styles.label, weight(600), { color: active ? colors.primary : colors.inkMuted2 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            {label}
          </Text>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
  node: { flex: 1, alignItems: 'center' },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 12 },
  label: { fontSize: 10, marginTop: 5, textAlign: 'center', paddingHorizontal: 2 },
});
