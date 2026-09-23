import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

interface Props {
  pct: number;
  color?: string;
  track?: string;
  height?: number;
}

export const ProgressBar: React.FC<Props> = ({ pct, color = colors.primary, track = colors.borderSoft, height = 8 }) => (
  <View style={[styles.track, { backgroundColor: track, height, borderRadius: height / 2 }]}>
    <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color, borderRadius: height / 2 }]} />
  </View>
);

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
