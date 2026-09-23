import { config } from '../../constants/config';
import { buildMockHomeSummary } from '../../mock/home';
import { request, mockResponse } from './client';
import type { HomeSummaryDto, ShiftReadinessDto } from '../../types/api';

export const homeApi = {
  async getSummary(query?: { lat?: number; lng?: number; accuracyM?: number }) {
    if (config.USE_MOCKS) {
      return mockResponse<HomeSummaryDto>(buildMockHomeSummary());
    }
    return request<HomeSummaryDto>('/home/summary', {
      query: {
        lat: query?.lat,
        lng: query?.lng,
        accuracyM: query?.accuracyM,
      },
    });
  },

  readiness(query?: { lat?: number; lng?: number; accuracyM?: number }) {
    if (config.USE_MOCKS) {
      return mockResponse<ShiftReadinessDto>({ ready: true, accuracyM: 8, onSite: true });
    }
    return request<ShiftReadinessDto>('/shifts/readiness', {
      query: {
        lat: query?.lat,
        lng: query?.lng,
        accuracyM: query?.accuracyM,
      },
    });
  },
};
