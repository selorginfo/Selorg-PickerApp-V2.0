import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import type { AttendanceSummaryDto, WalletBalanceDto } from '../../types/api';
import type { Payout } from '../../types';

export const attendanceApi = {
  getSummary(query?: { month?: string }) {
    if (config.USE_MOCKS) {
      return mockResponse<AttendanceSummaryDto>({
        present: { window: null, punchedInOnTime: false, hoursToday: '00:00:00', pct: 0 },
        detailsRows: [],
        ot: { totalHrs: '0 hrs', rate: '1.5x', totalEarnings: '₹0', weeks: [] },
        history: { month: '', dow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], cells: [], presentDays: 0, halfDays: 0 },
        stats: { presentDays: 0, halfDays: 0, otHours: 0 },
      });
    }
    return request<AttendanceSummaryDto>('/attendance/summary', { query });
  },
  getStats(query?: { month?: string }) {
    if (config.USE_MOCKS) return mockResponse({ presentDays: 0, halfDays: 0, otHours: 0 });
    return request<{ presentDays: number; halfDays: number; otHours: number }>('/attendance/stats', { query });
  },
  getAttendance(query?: { month?: string }) {
    if (config.USE_MOCKS) return this.getSummary(query);
    return request<AttendanceSummaryDto>('/attendance/summary', { query });
  },
  punchIn(payload?: { latitude?: number; longitude?: number; shiftId?: string }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true, time: new Date().toISOString() });
    return request('/attendance/punch-in', { method: 'POST', body: payload ?? {} });
  },
  punchOut(payload?: { latitude?: number; longitude?: number }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true, time: new Date().toISOString() });
    return request('/attendance/punch-out', { method: 'POST', body: payload ?? {} });
  },
};

// Re-export wallet helpers used by payouts (types kept local to avoid cycles)
export type { WalletBalanceDto, Payout };
