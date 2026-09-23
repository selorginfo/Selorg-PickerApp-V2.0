import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/icons/Icon';
import { colors, weight, shadows } from '../theme';
import { useUI } from '../hooks/useUI';
import type { IconName } from '../types';

function isErrorToast(message: string): boolean {
  return /timed out|fail|error|unavailable|invalid|unable|couldn'?t|please try|required|incorrect|cannot reach|not found|already exists|suspended|denied|network/i.test(
    message,
  );
}

export const Toast: React.FC = () => {
  const message = useUI().toastMessage;
  const anim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(anim, { toValue: message ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [message, anim]);

  if (!message) return null;

  // Sit above tab bar / home indicator without a magic fixed offset.
  const bottom = Math.max(insets.bottom, 12) + 72;
  const error = isErrorToast(message);
  const iconName: IconName = error ? 'alert' : 'check';
  const iconBg = error ? colors.danger : colors.primary;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          bottom,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}>
      <View style={styles.pill}>
        <View style={[styles.badge, { backgroundColor: iconBg }]}>
          <Icon name={iconName} size={10} color={colors.white} strokeWidth={3.4} />
        </View>
        <Text style={[styles.text, weight(700)]}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100, paddingHorizontal: 16 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 13,
    maxWidth: '88%',
    ...shadows.toast,
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: colors.white, fontSize: 13, flexShrink: 1 },
});
