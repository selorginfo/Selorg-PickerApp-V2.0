import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from '../icons/Icon';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { colors, weight } from '../../theme';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { useLayout } from '../../hooks/useLayout';

interface Props {
  active: boolean;
  onVerified: () => void;
  onBack?: () => void;
}

export const FingerprintScanPanel: React.FC<Props> = ({ active, onVerified, onBack }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const successDelay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { cappedSize } = useLayout();
  const size = cappedSize(188, 0.48);
  const iconSize = Math.round(size * 0.47);

  const {
    checking,
    available,
    authenticating,
    verified,
    error,
    authenticate,
    label,
  } = useBiometricAuth({
    visible: active,
    promptMessage: 'Place your finger on the sensor to verify your identity',
    autoTrigger: true,
    onSuccess: () => {
      successDelay.current = setTimeout(() => onVerified(), 450);
    },
  });

  useEffect(() => {
    if (!authenticating) return;
    const pulse = Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.94,
        duration: 110,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    pulse.start();
  }, [authenticating, scale]);

  useEffect(() => {
    return () => {
      if (successDelay.current) clearTimeout(successDelay.current);
    };
  }, []);

  const title = verified
    ? 'Fingerprint verified'
    : authenticating
      ? 'Verifying…'
      : checking
        ? 'Checking sensor…'
        : 'Place finger on sensor';

  const subtitle = verified
    ? 'Identity confirmed successfully'
    : authenticating
      ? `Use your ${label.toLowerCase()} when prompted`
      : available
        ? 'Authentication starts automatically. Place your finger on the sensor.'
        : error || 'Fingerprint is not set up on this device. Enable it in system settings.';

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, weight(800)]}>{title}</Text>

      <Animated.View style={[styles.ringWrap, { transform: [{ scale }] }]}>
        <View
          style={[
            styles.circle,
            { width: size, height: size, borderRadius: size / 2 },
            verified && styles.circleOk,
          ]}>
          <Icon
            name="fingerprint"
            size={iconSize}
            color={verified ? colors.primary : colors.primary}
            strokeWidth={1.7}
          />
          {authenticating && !verified ? (
            <View style={styles.spinner}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : null}
        </View>
      </Animated.View>

      <Text style={styles.copy}>{subtitle}</Text>

      {error && !verified ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        {!verified ? (
          <PrimaryButton
            label={available ? 'Scan fingerprint' : 'Try again'}
            onPress={() => {
              authenticate().catch(() => {});
            }}
            height={52}
            fontSize={15}
            disabled={checking || authenticating}
            loading={authenticating}
          />
        ) : (
          <PrimaryButton label="Continue" onPress={onVerified} height={52} fontSize={15} />
        )}
        {onBack ? (
          <Text style={styles.back} onPress={onBack}>
            Choose another method
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  title: { fontSize: 20, marginBottom: 18, textAlign: 'center' },
  ringWrap: { marginBottom: 18 },
  circle: {
    backgroundColor: colors.primarySoftBg,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOk: {
    backgroundColor: '#D8F0E0',
    borderColor: colors.primaryDark,
  },
  spinner: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234,245,236,0.35)',
  },
  copy: {
    fontSize: 13.5,
    color: colors.inkSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  errorBox: {
    alignSelf: 'stretch',
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12.5,
    textAlign: 'center',
    ...weight(600),
  },
  footer: { alignSelf: 'stretch', marginTop: 4, gap: 10 },
  back: {
    textAlign: 'center',
    color: colors.inkMuted,
    fontSize: 13.5,
    paddingVertical: 8,
    ...weight(600),
  },
});
