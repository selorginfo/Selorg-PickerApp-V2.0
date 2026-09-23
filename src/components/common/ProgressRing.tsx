import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, weight } from '../../theme';

interface Props {
  size: number;
  stroke: number;
  pct: number;
  color?: string;
  track?: string;
  label?: string;
  labelColor?: string;
  labelSize?: number;
}

export const ProgressRing: React.FC<Props> = ({
  size,
  stroke,
  pct,
  color = colors.primary,
  track = colors.borderSoft,
  label,
  labelColor = colors.primary,
  labelSize = 16,
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (circ * Math.max(0, Math.min(100, pct))) / 100;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {label ? (
        <Text style={[styles.label, weight(800), { color: labelColor, fontSize: labelSize }]}>{label}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  label: { position: 'absolute' },
});
