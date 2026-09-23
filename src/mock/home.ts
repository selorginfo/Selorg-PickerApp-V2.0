import type { HomeSummaryDto } from '../types/api';
import { DUMMY_SHIFT_WINDOW, dummyDevice, dummyHub, getDummyShift } from './dummyShift';

export const mockHome = {
  hub: dummyHub,
  shiftWindow: DUMMY_SHIFT_WINDOW,
  balance: { available: '₹4,850', pending: '₹1,200 pending' },
  orders: { count: 0, pending: 0, syncedLabel: 'Orders synced from HHD', progress: 0 },
  metrics: { todaysEarnings: '₹720', incentivesToday: '₹150' },
  performance: { rank: 'Top 12%', accuracy: 98, speedLabel: '42 items/hr', speedPct: 85 },
  collectDevice: { id: dummyDevice.id, copy: dummyDevice.copy },
};

export function buildMockHomeSummary(): HomeSummaryDto {
  return {
    picker: { id: '0000', name: 'Picker', initials: 'SP', role: 'Picker' },
    hub: { ...dummyHub },
    shift: getDummyShift(),
    balance: { available: '₹4,850', pending: '₹1,200 pending', availableAmount: 4850 },
    orders: { count: 0, pending: 0, syncedLabel: 'Orders synced from HHD', progress: 0 },
    metrics: { todaysEarnings: '₹720', incentivesToday: '₹150' },
    performance: { rank: 'Top 12%', accuracy: 98, speedLabel: '42 items/hr', speedPct: 85 },
    device: { ...dummyDevice },
    unreadNotifications: 2,
  };
}
