import type { MainStackParamList } from '../navigation/navigationTypes';

export const mockPicker = {
  id: '0000',
  name: '',
  phone: '',
  email: '',
  status: 'PENDING' as const,
  memberSince: '',
  hub: '',
  role: 'Picker',
};

/** Static structure only — live `sub` text is filled from APIs in ProfileScreen. */
export const profileMenuBase: ReadonlyArray<{
  icon: string;
  color: string;
  bg: string;
  title: string;
  /** Fallback when live data is still loading */
  subFallback: string;
  target: keyof MainStackParamList;
  key: 'device' | 'personal' | 'workHistory' | 'salary' | 'documents' | 'bank' | 'training' | 'support';
}> = [
  {
    key: 'device',
    icon: 'phone',
    color: '#1E8E43',
    bg: '#EAF5EC',
    title: 'Device Status',
    subFallback: 'Loading device…',
    target: 'DeviceStatus',
  },
  {
    key: 'personal',
    icon: 'user',
    color: '#0E8F8A',
    bg: '#E0F2F0',
    title: 'Personal Information',
    subFallback: 'Phone, address & emergency',
    target: 'PersonalInfo',
  },
  {
    key: 'workHistory',
    icon: 'clock',
    color: '#1E8E43',
    bg: '#EAF5EC',
    title: 'Work History',
    subFallback: 'Attendance & shift records',
    target: 'WorkHistory',
  },
  {
    key: 'salary',
    icon: 'wallet',
    color: '#0E8F8A',
    bg: '#E0F2F0',
    title: 'Salary',
    subFallback: 'Monthly pay, leave & OT',
    target: 'Salary',
  },
  {
    key: 'documents',
    icon: 'file',
    color: '#E8A317',
    bg: '#FCF2DC',
    title: 'Documents',
    subFallback: 'Loading documents…',
    target: 'Documents',
  },
  {
    key: 'bank',
    icon: 'card',
    color: '#1E8E43',
    bg: '#EAF5EC',
    title: 'Bank Account',
    subFallback: 'Loading bank…',
    target: 'BankDetails',
  },
  {
    key: 'training',
    icon: 'book',
    color: '#E8A317',
    bg: '#FCF2DC',
    title: 'Training',
    subFallback: 'Loading training…',
    target: 'Training',
  },
  {
    key: 'support',
    icon: 'settings',
    color: '#5E6E63',
    bg: '#EFF3EE',
    title: 'Support & Settings',
    subFallback: 'Help, FAQs & notifications',
    target: 'SupportSettings',
  },
];

/** @deprecated Use profileMenuBase + live subs — kept for mock/dev tooling only. */
export const profileMenu = profileMenuBase.map(m => ({
  icon: m.icon,
  color: m.color,
  bg: m.bg,
  title: m.title,
  sub: m.subFallback,
  target: m.target,
}));
