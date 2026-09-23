import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

interface Props {
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

/** iOS-style switch matching Component.toggleRow() geometry (46×28, knob 22). */
export const Toggle: React.FC<Props> = ({
  value,
  onToggle,
  disabled = false,
  testID,
  accessibilityLabel,
}) => (
  <Pressable
    onPress={onToggle}
    disabled={disabled}
    testID={testID}
    accessibilityRole="switch"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ checked: value, disabled }}
    style={[
      styles.track,
      { backgroundColor: value ? colors.primary : colors.toggleOff, opacity: disabled ? 0.55 : 1 },
    ]}>
    <View style={[styles.knob, { left: value ? 21 : 3 }]} />
  </Pressable>
);

const styles = StyleSheet.create({
  track: { width: 46, height: 28, borderRadius: 15, justifyContent: 'center' },
  knob: {
    position: 'absolute',
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
