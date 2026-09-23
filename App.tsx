import React, { useEffect } from 'react';
import { LogBox, StatusBar, StyleSheet, View } from 'react-native';

LogBox.ignoreLogs(['DrawerLayoutAndroid is deprecated']);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef, resetTo, resetToNested } from './src/navigation/navigationRef';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppStoreProvider, useStore } from './src/store/AppStore';
import { OverlayHost } from './src/overlays/OverlayHost';
import { DataStateSwitcher } from './src/components/dev/DataStateSwitcher';
import { ensureReachableApiHost } from './src/constants/config';
import { ApiError, setUnauthorizedHandler } from './src/services/api/client';
import { authApi } from './src/services/api/authApi';
import { registerDevicePushToken } from './src/services/api/notificationApi';
import { resolvePostAuthDestination } from './src/services/api/mappers';
import { resolvePushToken } from './src/services/push/pushTokenProvider';
import { storageService } from './src/services/storage/storageService';
import { colors } from './src/theme';

const navTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.screenBg,
    card: colors.surface,
    text: colors.ink,
    border: colors.border,
    notification: colors.danger,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};

function goToDestination(dest: 'Main' | 'Onboarding' | 'Status') {
  if (dest === 'Main') {
    resetTo('Main');
    return;
  }
  if (dest === 'Status') {
    resetToNested('Onboarding', 'Status');
    return;
  }
  resetTo('Onboarding');
}

const SessionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dispatch } = useStore();

  useEffect(() => {
    let logoutTimer: ReturnType<typeof setTimeout> | null = null;
    setUnauthorizedHandler(() => {
      // Coalesce burst 401s (profile menu parallel fetches) so we don't thrash navigation.
      if (logoutTimer) return;
      logoutTimer = setTimeout(() => {
        logoutTimer = null;
        storageService.remove('token').catch(() => undefined);
        dispatch({ type: 'auth/logout' });
        dispatch({ type: 'ui/setToast', value: 'Session expired. Please sign in again.' });
        resetTo('Auth');
      }, 250);
    });
    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      setUnauthorizedHandler(null);
    };
  }, [dispatch]);

  // Cold-start: restore JWT from storage and route past Login when still valid.
  // Always clear the splash within a hard timeout so a hung API never whitescreens.
  useEffect(() => {
    let cancelled = false;
    const failsafe = setTimeout(() => {
      if (!cancelled) dispatch({ type: 'auth/sessionReady' });
    }, 6000);

    (async () => {
      try {
        try {
          await ensureReachableApiHost();
        } catch {
          // Device may be offline at cold start — keep going; Send OTP will re-probe.
        }
        const token = await storageService.get<string>('token');
        if (cancelled) return;
        if (!token) {
          dispatch({ type: 'auth/sessionReady' });
          return;
        }

        dispatch({ type: 'auth/loginSuccess', token });

        let obState = null;
        try {
          obState = await authApi.onboardingState();
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            await storageService.remove('token');
            if (!cancelled) {
              dispatch({ type: 'auth/logout' });
              resetTo('Auth');
            }
            return;
          }
          // Transient network error — keep session; prefer Main
          obState = null;
        }

        if (cancelled) return;

        if (obState?.state) {
          dispatch({ type: 'ob/statusFetched', dto: obState });
        }

        const dest = resolvePostAuthDestination({
          dto: obState,
          isNewUser: false,
          intent: 'login',
        });

        if (dest === 'Onboarding' && obState?.step && obState.step >= 1 && obState.step <= 8) {
          dispatch({ type: 'ob/setStep', step: obState.step as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 });
        }

        goToDestination(dest);
        if (!cancelled) dispatch({ type: 'auth/sessionReady' });

        (async () => {
          try {
            const pushToken = await resolvePushToken();
            await registerDevicePushToken(pushToken);
          } catch {
            // Non-blocking on cold start
          }
        })().catch(() => undefined);
      } catch {
        if (!cancelled) dispatch({ type: 'auth/sessionReady' });
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(failsafe);
    };
  }, [dispatch]);

  return <>{children}</>;
};

const App: React.FC = () => (
  <GestureHandlerRootView style={styles.root}>
    <SafeAreaProvider>
      <AppStoreProvider>
        <StatusBar barStyle="dark-content" />
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          <SessionGate>
            <View style={styles.root}>
              <RootNavigator />
              <OverlayHost />
              <DataStateSwitcher />
            </View>
          </SessionGate>
        </NavigationContainer>
      </AppStoreProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
});

export default App;
