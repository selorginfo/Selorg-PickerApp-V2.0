import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList } from './navigationTypes';
import { Icon } from '../components/icons/Icon';
import { colors, weight } from '../theme';
import type { IconName } from '../types';
import { useStore } from '../store/AppStore';
import { HomeScreen } from '../screens/dashboard/HomeScreen';
import { AttendanceScreen } from '../screens/attendance/AttendanceScreen';
import { PerformanceScreen } from '../screens/performance/PerformanceScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, IconName> = {
  Home: 'home',
  Attendance: 'cal',
  Performance: 'target',
  Profile: 'user',
};

const TAB_CONTENT_HEIGHT = 54;

export const BottomTabNavigator: React.FC = () => {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  // Hide tabs while shift verify (or other full sheets) own the bottom of the screen.
  const hideTabBar =
    state.shift.step !== 'none' || state.ui.deviceSheet || state.ui.collectSheet || state.wallet.wdSheet;

  const bottomPad = Math.max(insets.bottom, 8);
  const barStyle = hideTabBar
    ? styles.barHidden
    : {
        ...styles.bar,
        height: TAB_CONTENT_HEIGHT + bottomPad,
        paddingBottom: bottomPad,
      };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted2,
        tabBarStyle: barStyle,
        tabBarLabelStyle: styles.label,
        tabBarIcon: ({ color, focused }) => (
          <Icon name={ICONS[route.name]} size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
        ),
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarAccessibilityLabel: 'Home', tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ tabBarAccessibilityLabel: 'Attendance', tabBarLabel: 'Attendance' }}
      />
      <Tab.Screen
        name="Performance"
        component={PerformanceScreen}
        options={{ tabBarAccessibilityLabel: 'Performance', tabBarLabel: 'Performance' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarAccessibilityLabel: 'Profile', tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingTop: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#EAEEE9',
  },
  barHidden: { display: 'none' },
  label: { fontSize: 10.5, ...weight(700) },
});
