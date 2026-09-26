import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { KycDocumentType } from '../types/api';

export type AuthStackParamList = {
  Login: undefined;
  Otp: undefined;
};

export type OnboardingStackParamList = {
  Wizard: undefined;
  Status: undefined;
  /** Pre-Main support (rejected / blocked / suspended) — same screens as Main stack. */
  SupportSettings: undefined;
  Faqs: undefined;
  ChatSupport: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Attendance: undefined;
  Performance: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;
  BankDetails: undefined;
  UpiDetails: undefined;
  Notifications: undefined;
  EditProfile: undefined;
  PersonalInfo: undefined;
  DeviceStatus: undefined;
  WorkHistory: undefined;
  Salary: undefined;
  Documents: undefined;
  UploadDocument: { type: KycDocumentType };
  Training: undefined;
  SupportSettings: undefined;
  Faqs: undefined;
  ChatSupport: undefined;
  /** Read-only order assignment visibility — picking remains on HHD. */
  AssignedWork: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

/** Tab screens that also push onto the parent Main stack. */
export type MainTabScreenNavigation<Tab extends keyof MainTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, Tab>,
  NativeStackNavigationProp<MainStackParamList>
>;

export type MainStackNavigation = NativeStackNavigationProp<MainStackParamList>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
