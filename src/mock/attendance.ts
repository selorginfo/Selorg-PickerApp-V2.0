import type { CalendarCell, KeyValue, OtWeek } from '../types';

// March 2026 starts Sunday; 31 days. day 9 = half (amber), Sundays = none, day 14 selected.
function buildCalendar(): CalendarCell[] {
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 35; i++) {
    const day = i + 1;
    if (day > 31) {
      cells.push({ n: '', tone: 'empty', selected: false });
      continue;
    }
    const sunday = i % 7 === 0;
    const tone: CalendarCell['tone'] = sunday ? 'none' : day === 9 ? 'half' : 'present';
    cells.push({ n: String(day), tone, selected: day === 14 });
  }
  return cells;
}

export const mockAttendance = {
  present: { window: '12:00 AM – 11:59 PM', punchedInOnTime: true, hoursToday: '07:24:10', pct: 82 },
  detailsRows: [
    { k: 'Warehouse / Darkstore', v: 'Indiranagar' },
    { k: 'Punch In', v: '12:02 AM' },
    { k: 'Expected Punch Out', v: '11:59 PM' },
    { k: 'Scheduled Hours', v: '24 hrs' },
  ] as KeyValue[],
  ot: {
    totalHrs: '12 hrs',
    rate: '1.5x',
    totalEarnings: '₹1,800',
    weeks: [
      { week: 'Week 1', range: 'Mar 1-7', hrs: '4 hrs', amt: '₹600' },
      { week: 'Week 2', range: 'Mar 8-14', hrs: '3 hrs', amt: '₹450' },
      { week: 'Week 3', range: 'Mar 15-21', hrs: '5 hrs', amt: '₹750' },
    ] as OtWeek[],
  },
  history: {
    month: 'March 2026',
    dow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    cells: buildCalendar(),
    presentDays: 22,
    halfDays: 1,
  },
  stats: { presentDays: 22, halfDays: 1, otHours: 12 },
};
