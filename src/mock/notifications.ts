import type { AppNotification } from '../types';
import { colors } from '../theme';

export const mockNotifications: AppNotification[] = [
  {
    id: 'n1',
    icon: 'check',
    color: colors.primary,
    bg: colors.primarySoftBg,
    title: 'Application approved',
    body: 'Welcome aboard! You can now start your first shift.',
    time: '2h ago',
  },
  {
    id: 'n2',
    icon: 'wallet',
    color: colors.teal,
    bg: colors.tealBg,
    title: 'Payout processed',
    body: '₹17,200 was transferred to your HDFC account.',
    time: 'Yesterday',
  },
  {
    id: 'n3',
    icon: 'zap',
    color: colors.amber,
    bg: colors.amberBg,
    title: 'Incentive unlocked',
    body: 'You earned a ₹150 speed bonus today. Keep it up!',
    time: '1d ago',
  },
  {
    id: 'n4',
    icon: 'cal',
    color: colors.primary,
    bg: colors.primarySoftBg,
    title: 'Shift reminder',
    body: 'Your shift at Indiranagar starts at 9:00 AM tomorrow.',
    time: '1d ago',
  },
];
