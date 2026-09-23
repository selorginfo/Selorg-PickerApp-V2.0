import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { useLayout } from '../../hooks/useLayout';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  background?: string;
  contentStyle?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  onRefresh?: () => void;
  refreshing?: boolean;
  testID?: string;
  /** Wrap content so the keyboard does not cover fields/buttons. */
  keyboard?: boolean;
  /**
   * Cap and center content on large/tablet widths so the UI does not stretch edge-to-edge.
   * Default: true.
   */
  constrainWidth?: boolean;
  contentMaxWidth?: number;
}

export const Screen: React.FC<Props> = ({
  children,
  scroll = true,
  padded = false,
  background = colors.screenBg,
  contentStyle,
  edges = ['top'],
  onRefresh,
  refreshing = false,
  testID,
  keyboard = false,
  constrainWidth = true,
  contentMaxWidth,
}) => {
  const layout = useLayout();
  const maxW = contentMaxWidth ?? layout.contentMaxWidth;

  const constrainedStyle: ViewStyle | undefined =
    constrainWidth && layout.isTablet
      ? { width: '100%', maxWidth: maxW, alignSelf: 'center' }
      : undefined;

  const inner = [padded ? styles.padded : null, constrainedStyle, contentStyle].filter(Boolean);

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.grow, ...inner]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, ...inner]}>{children}</View>
  );

  const withKeyboard = keyboard ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={edges} testID={testID}>
      {withKeyboard}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  padded: { padding: 16, paddingBottom: 28 },
});
