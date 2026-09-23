import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import type { PerformanceDto } from '../../types/api';

export const performanceApi = {
  get() {
    if (config.USE_MOCKS) {
      return mockResponse<PerformanceDto>({
        cards: [],
        todaysEarnings: '₹0',
        hub: null,
        weekBars: [],
      });
    }
    return request<PerformanceDto>('/performance/summary');
  },
  getSummary() {
    if (config.USE_MOCKS) {
      return mockResponse<PerformanceDto>({
        cards: [],
        todaysEarnings: '₹0',
        hub: null,
        weekBars: [],
      });
    }
    return request<PerformanceDto>('/performance/summary');
  },
  getHistory() {
    if (config.USE_MOCKS) return mockResponse({ history: [] });
    return request('/performance/history');
  },
};
