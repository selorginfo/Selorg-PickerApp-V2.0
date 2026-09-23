import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type {
  AuthStackParamList,
  MainStackParamList,
  OnboardingStackParamList,
  RootStackParamList,
} from './navigationTypes';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Reset to a top-level flow (auth / onboarding / main). Retries briefly if nav is not ready yet. */
export function resetTo(name: keyof RootStackParamList): void {
  const run = () => {
    if (!navigationRef.isReady()) return false;
    navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] }));
    return true;
  };
  if (run()) return;
  let tries = 0;
  const id = setInterval(() => {
    tries += 1;
    if (run() || tries >= 40) clearInterval(id);
  }, 50);
}

type NestedScreen =
  | { name: 'Auth'; screen: keyof AuthStackParamList }
  | { name: 'Onboarding'; screen: keyof OnboardingStackParamList }
  | { name: 'Main'; screen: keyof MainStackParamList };

/**
 * Reset root to a flow and land on a nested screen with a clean back stack.
 * Cross-root jumps must use this (or resetTo) — never plain navigate across Auth/Onboarding/Main.
 */
export function resetToNested(
  name: NestedScreen['name'],
  screen: string,
): void {
  const run = () => {
    if (!navigationRef.isReady()) return false;

    let nestedRoutes: { name: string }[];
    if (name === 'Auth') {
      // Login under target so header/hardware back returns to Login
      nestedRoutes =
        screen === 'Login' ? [{ name: 'Login' }] : [{ name: 'Login' }, { name: screen }];
    } else if (name === 'Onboarding') {
      nestedRoutes =
        screen === 'Wizard' ? [{ name: 'Wizard' }] : [{ name: 'Wizard' }, { name: screen }];
    } else {
      // Tabs under target so back returns to home tabs
      nestedRoutes =
        screen === 'Tabs' ? [{ name: 'Tabs' }] : [{ name: 'Tabs' }, { name: screen }];
    }

    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name,
            state: { routes: nestedRoutes, index: nestedRoutes.length - 1 },
          },
        ],
      }),
    );
    return true;
  };
  if (run()) return;
  let tries = 0;
  const id = setInterval(() => {
    tries += 1;
    if (run() || tries >= 40) clearInterval(id);
  }, 50);
}

/** Typed navigate for root flows (and nested screen params). */
export function navigate<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name],
): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.navigate({
      name,
      ...(params !== undefined ? { params } : {}),
    }),
  );
}

export function goBack(): void {
  if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
}

/**
 * Prefer popping the current screen. If there is no history (deeplink / cold entry),
 * reset Main to land on `fallbackScreen` with Tabs underneath.
 */
export function goBackOrToMain(fallbackScreen: keyof MainStackParamList): void {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
    return;
  }
  resetToNested('Main', fallbackScreen);
}
