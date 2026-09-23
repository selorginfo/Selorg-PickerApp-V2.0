import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '../icons/Icon';
import type { IconName } from '../../types';

interface Props {
  name: IconName;
  color: string;
  bg: string;
  size?: number;
  iconSize?: number;
  radius?: number;
}

/** Rounded-square icon chip — Component.iconBox() (38×38, radius 11, icon 20). */
export const IconChip: React.FC<Props> = ({ name, color, bg, size = 38, iconSize = 20, radius = 11 }) => (
  <View style={[styles.chip, { width: size, height: size, borderRadius: radius, backgroundColor: bg }]}>
    <Icon name={name} size={iconSize} color={color} strokeWidth={1.9} />
  </View>
);

const styles = StyleSheet.create({
  chip: { alignItems: 'center', justifyContent: 'center' },
});
