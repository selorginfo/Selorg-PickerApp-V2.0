import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../icons/Icon';
import { colors, weight } from '../../theme';

interface Props {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  dark?: boolean;
  /** No white bar / border — title sits on the screen background (onboarding). */
  flush?: boolean;
}

/** Top bar with a chevron-left back button + centered title. */
export const AppHeader: React.FC<Props> = ({ title, onBack, right, dark = false, flush = false }) => {
  const navigation = useNavigation();
  const back = onBack ?? (() => navigation.goBack());
  const fg = dark ? colors.white : colors.ink;
  return (
    <View style={[styles.wrap, dark ? styles.dark : flush ? styles.flush : styles.light]}>
      <Pressable onPress={back} hitSlop={10} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
        <Icon name="chevronLeft" size={22} color={fg} strokeWidth={2.2} />
      </Pressable>
      <Text style={[styles.title, weight(700), { color: fg }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  light: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  flush: { backgroundColor: 'transparent' },
  dark: { backgroundColor: colors.inkGreen },
  backBtn: { padding: 8, zIndex: 2 },
  title: {
    position: 'absolute',
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 17,
  },
  right: { minWidth: 38, alignItems: 'flex-end', marginLeft: 'auto', zIndex: 2 },
});
