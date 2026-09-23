import type { PerfCard, WeekBar } from '../types';
import { colors } from '../theme';

export const mockPerformance = {
  cards: [
    { icon: 'package', color: colors.teal, bg: colors.tealBg, value: '0', label: "Today's Orders" },
    { icon: 'target', color: colors.primary, bg: colors.primarySoftBg, value: '98%', label: 'Accuracy' },
    { icon: 'zap', color: colors.amber, bg: colors.amberBg, value: '42', label: 'Speed Score' },
    { icon: 'trophy', color: colors.primary, bg: colors.primarySoftBg, value: 'Top 12%', label: 'Performance' },
  ] as PerfCard[],
  todaysEarnings: '₹720',
  hub: 'Indiranagar Darkstore',
  weekBars: [
    { d: 'Mon', pct: 55, highlight: false },
    { d: 'Tue', pct: 72, highlight: false },
    { d: 'Wed', pct: 48, highlight: false },
    { d: 'Thu', pct: 90, highlight: true },
    { d: 'Fri', pct: 66, highlight: false },
    { d: 'Sat', pct: 80, highlight: false },
    { d: 'Sun', pct: 30, highlight: false },
  ] as WeekBar[],
  // home-screen performance card
  home: { rank: 'Top 12%', accuracy: 98, speedLabel: '42 items/hr', speedPct: 85 },
};
