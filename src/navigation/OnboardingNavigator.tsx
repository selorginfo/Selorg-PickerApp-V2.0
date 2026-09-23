import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './navigationTypes';
import { OnboardingWizardScreen } from '../screens/onboarding/OnboardingWizardScreen';
import { StatusGateScreen } from '../screens/onboarding/StatusGateScreen';
import { SupportSettingsScreen } from '../screens/support/SupportSettingsScreen';
import { FaqsScreen } from '../screens/support/FaqsScreen';
import { ChatSupportScreen } from '../screens/support/ChatSupportScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="Wizard" component={OnboardingWizardScreen} />
    <Stack.Screen name="Status" component={StatusGateScreen} />
    <Stack.Screen name="SupportSettings" component={SupportSettingsScreen} />
    <Stack.Screen name="Faqs" component={FaqsScreen} />
    <Stack.Screen name="ChatSupport" component={ChatSupportScreen} />
  </Stack.Navigator>
);
