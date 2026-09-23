import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './navigationTypes';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { useStore } from '../store/AppStore';
import { colors, weight } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * All three flows are registered so free navigation works.
 * Starts at Auth/Login; SessionGate restores a valid token and resetTo()s Main/Onboarding.
 */
export const RootNavigator: React.FC = () => {
  const { state } = useStore();
  const ready = state.auth.sessionReady;

  return (
    <>
      <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
      {!ready && (
        <View style={styles.splash} pointerEvents="auto">
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.splashLabel, weight(600)]}>Loading…</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  splashLabel: {
    marginTop: 14,
    fontSize: 14,
    color: colors.inkSecondary,
  },
});
