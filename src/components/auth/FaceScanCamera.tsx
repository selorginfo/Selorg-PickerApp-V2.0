import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from '../icons/Icon';
import { colors, weight } from '../../theme';
import { useLayout } from '../../hooks/useLayout';

interface Props {
  active: boolean;
  onVerified: () => void;
  scanMs?: number;
}

type VisionApi = typeof import('react-native-vision-camera');

let visionApi: VisionApi | null | undefined;

function getVision(): VisionApi | null {
  if (visionApi !== undefined) return visionApi;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    visionApi = require('react-native-vision-camera') as VisionApi;
  } catch {
    visionApi = null;
  }
  return visionApi;
}

const VisionPreview: React.FC<{ active: boolean; onReady: () => void }> = ({ active, onReady }) => {
  const vision = getVision()!;
  const { Camera, useCameraDevice, useCameraPermission } = vision;
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const readyRef = useRef(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().catch(() => {});
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (!active || !hasPermission || !device || readyRef.current) return;
    readyRef.current = true;
    onReady();
  }, [active, hasPermission, device, onReady]);

  if (!hasPermission) {
    return (
      <View style={styles.fallbackFill}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.camHint}>Allow camera access</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.fallbackFill}>
        <Icon name="face" size={72} color={colors.primary} />
        <Text style={styles.camHint}>No front camera</Text>
      </View>
    );
  }

  return <Camera style={StyleSheet.absoluteFill} device={device} isActive={active} />;
};

export const FaceScanCamera: React.FC<Props> = ({ active, onVerified, scanMs = 2400 }) => {
  const vision = getVision();
  const { cappedSize } = useLayout();
  const size = cappedSize(188, 0.48);
  const [phase, setPhase] = useState<'boot' | 'scanning' | 'verified'>('boot');
  const [progress, setProgress] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);
  const scanStarted = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('verified');
    setProgress(1);
    timers.current.push(setTimeout(() => onVerified(), 420));
  }, [onVerified]);

  const startScan = useCallback(() => {
    if (doneRef.current || scanStarted.current || !active) return;
    scanStarted.current = true;
    setPhase('scanning');
    setProgress(0);
    const started = Date.now();
    const tick = () => {
      if (doneRef.current || !active) return;
      const pct = Math.min(1, (Date.now() - started) / scanMs);
      setProgress(pct);
      if (pct >= 1) {
        finish();
        return;
      }
      timers.current.push(setTimeout(tick, 48));
    };
    timers.current.push(setTimeout(tick, 48));
  }, [active, finish, scanMs]);

  useEffect(() => {
    doneRef.current = false;
    scanStarted.current = false;
    clearTimers();
    if (!active) {
      setPhase('boot');
      setProgress(0);
      return;
    }

    setPhase('boot');
    if (!vision) {
      timers.current.push(setTimeout(startScan, 350));
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    const sweepLoop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    sweep.setValue(0);
    sweepLoop.start();

    return () => {
      pulseLoop.stop();
      sweepLoop.stop();
      clearTimers();
    };
  }, [active, pulse, startScan, sweep, vision]);

  const sweepY = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-(size * 0.37), size * 0.37],
  });

  const copy =
    phase === 'verified'
      ? 'Face verified'
      : phase === 'scanning'
        ? 'Hold still and keep your face in the circle'
        : 'Starting camera…';

  const iconSize = Math.round(size * 0.38);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, weight(800)]}>
        {phase === 'verified' ? 'Face verified' : 'Scanning your face…'}
      </Text>

      <Animated.View style={[styles.ringWrap, { transform: [{ scale: pulse }] }]}>
        <View
          style={[
            styles.circle,
            { width: size, height: size, borderRadius: size / 2 },
            phase === 'verified' && styles.circleOk,
          ]}>
          {active && vision ? (
            <VisionPreview active={active && phase !== 'verified'} onReady={startScan} />
          ) : (
            <View style={styles.fallbackFill}>
              <Icon name="face" size={iconSize} color={colors.primary} />
            </View>
          )}
          {phase === 'scanning' && (
            <Animated.View style={[styles.scanLine, { transform: [{ translateY: sweepY }] }]} />
          )}
          {phase === 'verified' && (
            <View style={styles.okOverlay}>
              <Icon name="check" size={Math.round(size * 0.25)} color={colors.white} strokeWidth={2.6} />
            </View>
          )}
        </View>
      </Animated.View>

      <Text style={styles.copy}>{copy}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <Text style={[styles.progressLabel, weight(700)]}>{Math.round(progress * 100)}%</Text>

      {!vision && phase !== 'verified' ? (
        <Pressable style={styles.manual} onPress={finish}>
          <Text style={[styles.manualText, weight(700)]}>Continue without camera</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  title: { fontSize: 20, marginBottom: 18, textAlign: 'center' },
  ringWrap: { marginBottom: 16 },
  circle: {
    overflow: 'hidden',
    backgroundColor: colors.primarySoftBg,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOk: { borderColor: colors.primaryDark },
  fallbackFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoftBg,
    gap: 8,
  },
  camHint: { fontSize: 12, color: colors.inkSecondary, ...weight(600) },
  scanLine: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.mint,
    opacity: 0.9,
  },
  okOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(30,142,67,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    fontSize: 13.5,
    color: colors.inkSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
  },
  manual: { paddingVertical: 8 },
  manualText: { color: colors.inkMuted, fontSize: 13 },
});
