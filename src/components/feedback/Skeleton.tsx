import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  height: number;
  width?: number | string;
  radius?: number;
  style?: ViewStyle;
}

/** `.skel` shimmer block from the HTML (shimmer 1.3s). */
export const Skeleton: React.FC<Props> = ({ height, width = '100%', radius = 8, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1300, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5] });
  return (
    <Animated.View
      style={[styles.base, { height, width: width as ViewStyle['width'], borderRadius: radius, opacity }, style]}
    />
  );
};

const styles = StyleSheet.create({
  base: { backgroundColor: '#EDF1EC' },
});
