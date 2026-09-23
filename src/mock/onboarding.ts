import type { ShiftOption, TrainingModule, WorkLocation } from '../types';

export const mockWorkLocations: WorkLocation[] = [
  { id: 'indiranagar', title: 'Indiranagar Darkstore', sub: '2.1 km · 80 Ft Rd, HAL 2nd Stage' },
  { id: 'koramangala', title: 'Koramangala Darkstore', sub: '4.8 km · 5th Block' },
  { id: 'whitefield', title: 'Whitefield Hub', sub: '11.3 km · ITPL Main Rd' },
];

export const mockShiftOptions: ShiftOption[] = [
  { id: 'fullday', title: 'Full day · 12:00 AM – 11:59 PM', sub: '24h · always open' },
];

export const mockOnboardingTraining: TrainingModule[] = [
  { name: 'App & shift basics', dur: '12 min' },
  { name: 'Order handling & quality', dur: '18 min' },
  { name: 'Safety & hygiene', dur: '10 min' },
  { name: 'Customer & returns', dur: '15 min' },
];

export const reviewItems = [
  { label: 'Documents submitted', status: 'Done', done: true },
  { label: 'Aadhaar & PAN KYC', status: 'Done', done: true },
  { label: 'Face verification', status: 'Verifying', done: false },
  { label: 'Manager approval', status: 'Pending', done: false },
] as const;
