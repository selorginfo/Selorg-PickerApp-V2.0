import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { CONTENT_MAX_WIDTH } from '../../hooks/useLayout';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** center = alert dialog; bottom = action sheet. */
  variant?: 'bottom' | 'center';
  dismissable?: boolean;
}

export const BottomSheet: React.FC<Props> = ({
  visible,
  onClose,
  children,
  variant = 'bottom',
  dismissable = true,
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 768;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [variant === 'bottom' ? Math.min(420, windowHeight * 0.45) : 40, 0],
  });

  const maxSheetHeight = windowHeight * 0.92;
  const bottomInset = Math.max(insets.bottom, 12);

  if (variant === 'center') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
        <KeyboardAvoidingView
          style={[styles.scrim, styles.scrimCenter]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} />
          <Animated.View
            style={[
              styles.dialog,
              {
                maxHeight: windowHeight * 0.8,
                maxWidth: isWide ? CONTENT_MAX_WIDTH : undefined,
                alignSelf: 'center',
                transform: [{ translateY }],
                opacity: anim,
              },
            ]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContentCenter}>
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} />
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: maxSheetHeight,
              maxWidth: isWide ? CONTENT_MAX_WIDTH : undefined,
              alignSelf: 'center',
              width: '100%',
              paddingBottom: bottomInset,
              transform: [{ translateY }],
              opacity: anim,
            },
          ]}>
          <View style={styles.grabber} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.overlayScrim,
    justifyContent: 'flex-end',
  },
  scrimCenter: {
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 12,
    overflow: 'hidden',
  },
  dialog: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    overflow: 'hidden',
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDE4DD',
    alignSelf: 'center',
    marginBottom: 16,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 8,
    flexGrow: 0,
  },
  scrollContentCenter: {
    flexGrow: 0,
  },
});
