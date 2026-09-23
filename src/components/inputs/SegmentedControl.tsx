import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, weight } from '../../theme';

interface Props<T extends string> {
  options: readonly { label: string; value: T }[] | readonly T[];
  value: T;
  onChange: (v: T) => void;
  /** 'pill' = login-style inset track; 'outline' = bordered boxes (onboarding/profile). */
  variant?: 'pill' | 'outline';
}

export function SegmentedControl<T extends string>({ options, value, onChange, variant = 'outline' }: Props<T>) {
  const opts = options.map(o => (typeof o === 'string' ? { label: o, value: o as T } : o));
  const wrapOutline = variant === 'outline' && opts.length >= 4;

  if (variant === 'pill') {
    return (
      <View style={styles.pillTrack}>
        {opts.map(o => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[styles.pillItem, active && styles.pillItemActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}>
              <Text
                style={[
                  styles.pillLabel,
                  weight(active ? 700 : 600),
                  { color: active ? colors.primary : colors.inkSecondary },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.outlineRow, wrapOutline && styles.outlineWrap]}>
      {opts.map(o => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.box,
              wrapOutline ? styles.boxWrapped : styles.boxFlex,
              {
                borderColor: active ? colors.primary : colors.inputBorder,
                backgroundColor: active ? colors.primarySoftBg : colors.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}>
            <Text
              style={[
                styles.boxLabel,
                weight(active ? 800 : 600),
                { color: active ? colors.primary : colors.inkSecondary },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pillTrack: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.neutralGreenBg,
    padding: 4,
    borderRadius: 12,
  },
  pillItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9, minHeight: 40 },
  pillItemActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pillLabel: { fontSize: 13 },
  outlineRow: { flexDirection: 'row', gap: 8 },
  outlineWrap: { flexWrap: 'wrap' },
  box: {
    minHeight: 46,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  boxFlex: { flex: 1 },
  /** Two-up grid when 4+ options — avoids crushing labels on narrow phones. */
  boxWrapped: { width: '48%', flexGrow: 1 },
  boxLabel: { fontSize: 13, textAlign: 'center' },
});
