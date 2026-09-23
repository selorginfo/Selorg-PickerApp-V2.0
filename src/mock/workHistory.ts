import type { WorkDay } from '../types';

export const mockWorkHistory = {
  month: 'March 2026',
  summary: { present: '22', overtime: '12h', total: '198h' },
  rows: [
    { date: 'Wed, 11 Mar', hub: 'Indiranagar', hrs: '9h 02m', badge: 'Present', tone: 'success' },
    { date: 'Tue, 10 Mar', hub: 'Indiranagar', hrs: '9h 14m', badge: 'Present +OT', tone: 'success' },
    { date: 'Mon, 09 Mar', hub: 'Indiranagar', hrs: '4h 30m', badge: 'Half day', tone: 'warning' },
    { date: 'Sat, 07 Mar', hub: 'Koramangala', hrs: '9h 00m', badge: 'Present', tone: 'success' },
    { date: 'Fri, 06 Mar', hub: 'Indiranagar', hrs: '—', badge: 'Absent', tone: 'danger' },
  ] as WorkDay[],
};
