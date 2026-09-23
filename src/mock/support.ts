import { colors } from '../theme';
import type { IconName, Language } from '../types';

export const helpActions: { icon: IconName; color: string; bg: string; label: string; sub: string; action: 'chat' | 'call' | 'mail' }[] = [
  { icon: 'chat', color: colors.primary, bg: colors.primarySoftBg, label: 'Chat with support', sub: 'Avg reply under 5 min', action: 'chat' },
  { icon: 'phone', color: colors.teal, bg: colors.tealBg, label: 'Call support', sub: '+91 9444183378 · 9am–9pm', action: 'call' },
  { icon: 'mail', color: colors.amber, bg: colors.amberBg, label: 'Email us', sub: 'selorginfo@gmail.com', action: 'mail' },
];

export const settingsRows: { key: 'push' | 'shiftRem' | 'payout' | 'incentive' | 'sound'; label: string; sub: string }[] = [
  { key: 'push', label: 'Push notifications', sub: 'Order, shift & payout alerts' },
  { key: 'shiftRem', label: 'Shift reminders', sub: '30 min before your shift' },
  { key: 'payout', label: 'Payout alerts', sub: 'When money is credited' },
  { key: 'incentive', label: 'Incentive updates', sub: 'Bonus & streak nudges' },
  { key: 'sound', label: 'In-app sounds', sub: 'Scan & success chimes' },
];

/** Matches selorg-service `PICKER_LANGUAGE_CATALOG` / `PICKER_LANGUAGES`. */
export const languageOptions: readonly { label: string; value: Language }[] = [
  { label: 'English', value: 'en' },
  { label: 'हिन्दी', value: 'hi' },
  { label: 'ಕನ್ನಡ', value: 'kn' },
  { label: 'தமிழ்', value: 'ta' },
  { label: 'తెలుగు', value: 'te' },
] as const;
