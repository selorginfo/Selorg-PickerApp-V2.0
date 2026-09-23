import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, weight } from '../../theme';

interface Props {
  initials: string;
  /** Remote or local image URI — shown instead of initials when set. */
  uri?: string | null;
  size?: number;
  radius?: number;
  bg?: string;
  fg?: string;
  fontSize?: number;
  style?: ViewStyle;
}

export const Avatar: React.FC<Props> = ({
  initials,
  uri,
  size = 44,
  radius = 14,
  bg = colors.primary,
  fg = colors.white,
  fontSize = 17,
  style,
}) => (
  <View style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor: bg }, style]}>
    {uri ? (
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />
    ) : (
      <Text style={[weight(800), { color: fg, fontSize }]}>{initials}</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
