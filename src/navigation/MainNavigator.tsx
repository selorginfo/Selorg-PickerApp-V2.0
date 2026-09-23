import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from './navigationTypes';
import { BottomTabNavigator } from './BottomTabNavigator';
import { PayoutsScreen } from '../screens/payouts/PayoutsScreen';
import { BankDetailsScreen } from '../screens/payouts/BankDetailsScreen';
import { UpiDetailsScreen } from '../screens/payouts/UpiDetailsScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { PersonalInfoScreen } from '../screens/profile/PersonalInfoScreen';
import { DeviceStatusScreen } from '../screens/profile/DeviceStatusScreen';
import { WorkHistoryScreen } from '../screens/profile/WorkHistoryScreen';
import { DocumentsScreen } from '../screens/profile/DocumentsScreen';
import { UploadDocumentScreen } from '../screens/profile/UploadDocumentScreen';
import { TrainingScreen } from '../screens/profile/TrainingScreen';
import { SupportSettingsScreen } from '../screens/support/SupportSettingsScreen';
import { FaqsScreen } from '../screens/support/FaqsScreen';
import { ChatSupportScreen } from '../screens/support/ChatSupportScreen';
import { AssignedWorkScreen } from '../screens/dashboard/AssignedWorkScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="Tabs" component={BottomTabNavigator} />
    <Stack.Screen name="Payouts" component={PayoutsScreen} />
    <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
    <Stack.Screen name="UpiDetails" component={UpiDetailsScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
    <Stack.Screen name="DeviceStatus" component={DeviceStatusScreen} />
    <Stack.Screen name="WorkHistory" component={WorkHistoryScreen} />
    <Stack.Screen name="Documents" component={DocumentsScreen} />
    <Stack.Screen name="UploadDocument" component={UploadDocumentScreen} />
    <Stack.Screen name="Training" component={TrainingScreen} />
    <Stack.Screen name="SupportSettings" component={SupportSettingsScreen} />
    <Stack.Screen name="Faqs" component={FaqsScreen} />
    <Stack.Screen name="ChatSupport" component={ChatSupportScreen} />
    <Stack.Screen name="AssignedWork" component={AssignedWorkScreen} />
  </Stack.Navigator>
);
