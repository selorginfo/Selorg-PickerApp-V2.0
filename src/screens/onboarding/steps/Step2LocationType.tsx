import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, weight, shadows } from '../../../theme';
import { SegmentedControl } from '../../../components/inputs/SegmentedControl';
import { useOnboarding } from '../../../hooks/useOnboarding';

export const Step2LocationType: React.FC = () => {
  const ob = useOnboarding();
  return (
    <View style={styles.card}>
      <Text style={[styles.title, weight(800)]}>Where will you work?</Text>
      <Text style={styles.sub}>Pick the type of facility you'll be based at.</Text>
      <SegmentedControl
        options={['Darkstore', 'Warehouse'] as const}
        value={ob.locType as 'Darkstore' | 'Warehouse'}
        onChange={ob.setLocType}
      />
      <Text style={styles.help}>
        Darkstores handle quick-commerce orders; warehouses handle bulk fulfilment. Your manager confirms this during
        collection.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 20, ...shadows.card },
  title: { fontSize: 15, marginBottom: 2 },
  sub: { fontSize: 12.5, color: colors.inkSecondary, marginBottom: 18 },
  help: { fontSize: 12, color: colors.inkMuted, lineHeight: 19, marginTop: 14 },
});
