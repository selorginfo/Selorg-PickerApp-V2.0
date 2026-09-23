import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import { mapTrainingModule } from './mappers';
import type { TrainingModuleDto } from '../../types/api';

export const trainingApi = {
  async listVideos(): Promise<TrainingModuleDto[]> {
    if (config.USE_MOCKS) return mockResponse([]);
    const rows = await request<TrainingModuleDto[]>('/training/videos');
    return (Array.isArray(rows) ? rows : []).map(mapTrainingModule);
  },
  getVideo(videoId: string) {
    if (config.USE_MOCKS) return mockResponse(null);
    return request(`/training/videos/${encodeURIComponent(videoId)}`);
  },
  getProgress() {
    if (config.USE_MOCKS) return mockResponse({ completed: [], total: 0 });
    return request<{ completed: string[]; total: number }>('/training/user-progress');
  },
  watchProgress(payload: { videoId: string; progress: number }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/training/watch-progress', { method: 'PUT', body: payload });
  },
  markComplete(videoId: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true, videoId });
    return request(`/training/complete/${encodeURIComponent(videoId)}`, { method: 'POST' });
  },
  completeModule(moduleId: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request(`/training/modules/${encodeURIComponent(moduleId)}/complete`, { method: 'POST' });
  },
  submitAssessment(payload: { answers: unknown[] }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true, passed: true });
    return request<{ ok: boolean; passed: boolean }>('/training/assessment', {
      method: 'POST',
      body: payload,
    });
  },
  modules() {
    return this.listVideos();
  },
};
