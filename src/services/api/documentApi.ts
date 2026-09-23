import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import { mapDocumentDtos, mapDocuments } from './mappers';
import type { DocumentDto, KycDocumentSide, KycDocumentType } from '../../types/api';
import type { DocItem } from '../../types';
import { profileApi } from './profileApi';

export const documentApi = {
  async list(): Promise<DocItem[]> {
    if (config.USE_MOCKS) return mockResponse([]);
    return mapDocuments(await request('/documents'));
  },

  async listKyc(): Promise<DocumentDto[]> {
    if (config.USE_MOCKS) return mockResponse([]);
    return mapDocumentDtos(await request('/documents'));
  },

  upload(payload: { type: string; [key: string]: unknown }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true, id: 'mock-doc' });
    return request('/documents/upload', { method: 'POST', body: payload });
  },

  uploadKyc(
    type: KycDocumentType,
    photoUri: string,
    opts?: { side?: KycDocumentSide; fileName?: string; mimeType?: string },
  ) {
    return profileApi.uploadKycDocument(type, photoUri, opts);
  },
};
