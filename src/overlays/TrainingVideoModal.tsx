import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/icons/Icon';
import { colors, weight, fontFamily } from '../theme';
import { useUI } from '../hooks/useUI';
import { formatVideoTime } from '../utils/formatters';
import { useLayout, CONTENT_MAX_WIDTH } from '../hooks/useLayout';

export const TrainingVideoModal: React.FC = () => {
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const layout = useLayout();

  return (
    <Modal visible={ui.videoOpen} transparent animationType="fade" onRequestClose={ui.closeVideo} statusBarTranslucent>
      <View style={[styles.scrim, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          style={[styles.close, { top: insets.top + 8 }]}
          onPress={ui.closeVideo}
          hitSlop={8}
          accessibilityLabel="Close video">
          <Icon name="close" size={20} color={colors.white} strokeWidth={2} />
        </Pressable>
        <View style={[styles.player, layout.isTablet && { maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.stage}>
            <Pressable style={styles.playBtn} onPress={ui.toggleVideoPlay}>
              <Icon name={ui.videoPlaying ? 'pause' : 'play'} size={30} color={colors.inkGreen} />
            </Pressable>
            <Text style={styles.brand}>SELORG TRAINING</Text>
          </View>
          <View style={styles.bar}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${ui.videoProgress}%` }]} />
            </View>
            <View style={styles.meta}>
              <Text style={[styles.title, weight(700)]} numberOfLines={2}>
                {ui.videoTitle}
              </Text>
              <Text style={styles.time}>{formatVideoTime(ui.videoProgress)}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.videoScrim, justifyContent: 'center', paddingHorizontal: 20 },
  close: {
    position: 'absolute',
    right: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  player: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#000', width: '100%' },
  stage: { aspectRatio: 16 / 9, backgroundColor: colors.inkGreen, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    position: 'absolute',
    top: 14,
    left: 16,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bar: { backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 14 },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.white, fontSize: 13.5, flex: 1 },
  time: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: fontFamily.mono },
});
