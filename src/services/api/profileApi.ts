import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import { mapDeviceResponse, mapDocumentDtos, mapDocuments, toIsoDob } from './mappers';
import { normalizePickerGender } from '../../utils/gender';
import type {
  AssignedDeviceDto,
  DocumentDto,
  KycDocumentSide,
  KycDocumentType,
  Picker,
  WorkHistoryDto,
} from '../../types/api';
import type { DocItem } from '../../types';
import { mockDocuments } from '../../mock/documents';

export const profileApi = {
  getProfile() {
    if (config.USE_MOCKS) {
      return mockResponse<Picker>({
        id: '0000',
        name: '',
        phone: '',
        email: '',
        status: 'PENDING',
        memberSince: '',
        hub: '',
        role: 'Picker',
      });
    }
    return request<Picker>('/user/profile');
  },

  getOverview() {
    if (config.USE_MOCKS) return mockResponse(null);
    return request('/user/profile/overview');
  },

  updateProfile(data: Record<string, unknown>) {
    if (config.USE_MOCKS) return mockResponse({ ok: true, ...data });
    const body = { ...data };
    if (typeof body.dob === 'string') body.dob = toIsoDob(body.dob);
    if (typeof body.gender === 'string') {
      const gender = normalizePickerGender(body.gender);
      if (gender) body.gender = gender;
      else delete body.gender;
    }
    return request<Picker>('/user/profile', { method: 'PUT', body });
  },

  setUpi(upi: string) {
    if (config.USE_MOCKS) {
      return mockResponse({
        upiId: upi,
        upiName: null as string | null,
        upiPayoutVerificationStatus: 'pending' as const,
        upiPayoutRejectionReason: null as string | null,
        upiPayoutSubmittedAt: new Date().toISOString() as string | null,
      });
    }
    return request<{
      upiId: string;
      upiName: string | null;
      upiPayoutVerificationStatus: 'none' | 'pending' | 'verified' | 'rejected';
      upiPayoutRejectionReason: string | null;
      upiPayoutSubmittedAt: string | null;
    }>('/user/upi', { method: 'PUT', body: { upi } });
  },

  save(section: 'edit' | 'personal' | 'bank', data: Record<string, unknown>) {
    if (config.USE_MOCKS) return mockResponse({ ok: true, section, data });
    if (section === 'bank') {
      return request('/bank/accounts', {
        method: 'POST',
        body: {
          holder: data.holder,
          bank: data.bank,
          acc: data.acc,
          ifsc: data.ifsc,
        },
      });
    }
    if (section === 'personal') {
      const alt = String(data.altPhone || '').replace(/\D/g, '').slice(-10);
      const body: Record<string, unknown> = {
        address: String(data.address || '').trim(),
        city: String(data.city || '').trim(),
        pincode: String(data.pincode || '').replace(/\D/g, '').slice(0, 6),
        emergencyContact: {
          name: String(data.emgName || '').trim(),
          phone: String(data.emgPhone || '').replace(/\D/g, '').slice(-10),
          relation: String(data.emgRel || '').trim(),
        },
      };
      if (alt) body.altPhone = alt;
      if (typeof data.email === 'string' && data.email.trim()) {
        body.email = String(data.email).trim().toLowerCase();
      }
      if (typeof data.phone === 'string' && data.phone.trim()) {
        body.phone = String(data.phone).replace(/\D/g, '').slice(-10);
      }
      return request<Picker>('/user/profile', { method: 'PUT', body });
    }
    const body = { ...data };
    if (typeof body.dob === 'string') body.dob = toIsoDob(String(body.dob));
    if (typeof body.gender === 'string') {
      const gender = normalizePickerGender(body.gender);
      if (gender) body.gender = gender;
      else delete body.gender;
    }
    return request<Picker>('/user/profile', { method: 'PUT', body });
  },

  async getDevice(): Promise<AssignedDeviceDto> {
    if (config.USE_MOCKS) return mockResponse({ device: null, rows: [] });
    // skipAuthRecovery: a 401 here must surface as DeviceStatus ErrorState, not
    // immediately boot the user to Login (e.g. after a secondary session remint).
    const raw = await request<unknown>('/devices/assigned', { skipAuthRecovery: true });
    return mapDeviceResponse(raw);
  },

  acknowledgeDeviceCollection(deviceId?: string) {
    if (config.USE_MOCKS) return mockResponse({ acknowledged: true });
    return request('/devices/collection-complete', {
      method: 'POST',
      body: deviceId ? { deviceId } : {},
    });
  },

  returnDevice() {
    if (config.USE_MOCKS) return mockResponse({ returned: true });
    return request('/devices/return', { method: 'POST' });
  },

  getWorkHistory(query?: { month?: string }) {
    if (config.USE_MOCKS) {
      return mockResponse<WorkHistoryDto>({ month: '', summary: { present: '0', overtime: '0h', total: '0h' }, rows: [] });
    }
    return request<WorkHistoryDto>('/attendance', { query: { ...query, view: 'history' } });
  },

  async getDocuments(): Promise<DocItem[]> {
    if (config.USE_MOCKS) return mockResponse(mockDocuments);
    const raw = await request<unknown>('/documents');
    return mapDocuments(raw);
  },

  async listKycDocuments(): Promise<DocumentDto[]> {
    if (config.USE_MOCKS) return mockResponse([]);
    const raw = await request<unknown>('/documents');
    return mapDocumentDtos(raw);
  },

  /**
   * KYC document upload — Base64 JSON to POST /uploads (purpose=document).
   * Backend stores Base64 in MongoDB and returns a data URI for display.
   */
  uploadKycDocument(
    type: KycDocumentType,
    photoUri: string,
    opts?: { side?: KycDocumentSide; fileName?: string; mimeType?: string; base64?: string },
  ): Promise<DocumentDto> {
    if (config.USE_MOCKS) {
      throw new Error('Mock document upload is disabled — use the real API');
    }

    const ext = (opts?.fileName || photoUri).split('.').pop()?.toLowerCase();
    const mime =
      opts?.mimeType ||
      (ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'heic' || ext === 'heif'
            ? 'image/heic'
            : 'image/jpeg');
    const name =
      opts?.fileName ||
      `${type}${opts?.side ? `-${opts.side}` : ''}.${
        ext === 'png' || ext === 'webp' || ext === 'heic' ? ext : 'jpg'
      }`;

    const ocrType =
      type === 'aadhar' || type === 'aadhaar' ? 'aadhaar' : type === 'pan' ? 'pan' : type === 'dl' ? 'dl' : undefined;

    // Prefer multipart file upload (reliable on Android). Fall back to JSON Base64.
    if (photoUri) {
      const form = new FormData();
      form.append('file', {
        uri: photoUri,
        type: mime,
        name,
      } as unknown as Blob);
      form.append('purpose', 'document');
      form.append('ocrType', ocrType || type);
      form.append('fileName', name);
      form.append('mimeType', mime);
      if (opts?.side) form.append('side', opts.side);

      return request<{
        url?: string;
        base64?: string;
        mimeType?: string;
        fileName?: string;
        id?: string;
      }>('/uploads', {
        method: 'POST',
        body: form,
        formData: true,
        timeoutMs: 120_000,
      }).then(uploaded => {
        const dataUri =
          uploaded.url ||
          (uploaded.base64
            ? `data:${uploaded.mimeType || mime};base64,${uploaded.base64}`
            : opts.base64
              ? `data:${mime};base64,${opts.base64}`
              : photoUri);
        return {
          id: uploaded.id,
          type,
          side: opts?.side ?? null,
          url: dataUri,
          base64: uploaded.base64 || opts.base64,
          mimeType: uploaded.mimeType || mime,
          fileName: uploaded.fileName || name,
          status: 'pending',
        } as DocumentDto;
      });
    }

    if (!opts?.base64) {
      throw new Error('Base64 image data is required for document upload');
    }

    return request<{
      url?: string;
      base64?: string;
      mimeType?: string;
      fileName?: string;
      id?: string;
    }>('/uploads', {
      method: 'POST',
      body: {
        base64: opts.base64,
        purpose: 'document',
        ocrType: ocrType || type,
        fileName: name,
        mimeType: mime,
        side: opts?.side,
      },
      timeoutMs: 120_000,
    }).then(uploaded => {
      const dataUri =
        uploaded.url ||
        (uploaded.base64
          ? `data:${uploaded.mimeType || mime};base64,${uploaded.base64}`
          : `data:${mime};base64,${opts.base64}`);
      return {
        id: uploaded.id,
        type,
        side: opts?.side ?? null,
        url: dataUri,
        base64: uploaded.base64 || opts.base64,
        mimeType: uploaded.mimeType || mime,
        fileName: uploaded.fileName || name,
        status: 'pending',
      } as DocumentDto;
    });
  },

  /** Profile avatar — POST /uploads with purpose=avatar (updates user.photoUri). */
  uploadAvatar(
    photoUri: string,
    opts?: { fileName?: string; mimeType?: string },
  ): Promise<{ url: string; fileName?: string; mimeType?: string; sizeBytes?: number }> {
    if (config.USE_MOCKS) {
      return mockResponse({ url: photoUri, fileName: opts?.fileName || 'avatar.jpg' });
    }

    const ext = (opts?.fileName || photoUri).split('.').pop()?.toLowerCase();
    const mime =
      opts?.mimeType ||
      (ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'heic' || ext === 'heif'
            ? 'image/heic'
            : 'image/jpeg');
    const name =
      opts?.fileName ||
      `avatar.${ext === 'png' || ext === 'webp' || ext === 'heic' ? ext : 'jpg'}`;

    const form = new FormData();
    form.append('file', {
      uri: photoUri,
      type: mime,
      name,
    } as unknown as Blob);
    form.append('purpose', 'avatar');
    form.append('fileName', name);

    return request('/uploads', {
      method: 'POST',
      body: form,
      formData: true,
    });
  },

  /** Face capture — POST /uploads with purpose=face (does not change avatar). */
  uploadFace(
    photoUri: string,
    opts?: { fileName?: string; mimeType?: string },
  ): Promise<{ url: string; fileName?: string; mimeType?: string; sizeBytes?: number }> {
    if (config.USE_MOCKS) {
      return mockResponse({ url: photoUri, fileName: opts?.fileName || 'face.jpg' });
    }

    const ext = (opts?.fileName || photoUri).split('.').pop()?.toLowerCase();
    const mime =
      opts?.mimeType ||
      (ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'heic' || ext === 'heif'
            ? 'image/heic'
            : 'image/jpeg');
    const name =
      opts?.fileName ||
      `face.${ext === 'png' || ext === 'webp' || ext === 'heic' ? ext : 'jpg'}`;

    const form = new FormData();
    form.append('file', {
      uri: photoUri,
      type: mime,
      name,
    } as unknown as Blob);
    form.append('purpose', 'face');
    form.append('fileName', name);

    return request('/uploads', {
      method: 'POST',
      body: form,
      formData: true,
    });
  },

  uploadDocument(payload: { type: string; [key: string]: unknown }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/documents/upload', { method: 'POST', body: payload });
  },

  requestAccountDeletion(reason?: string) {
    if (config.USE_MOCKS) return mockResponse({ requested: true });
    return request('/account/delete-request', { method: 'POST', body: { reason } });
  },

  reportDeviceIssue(payload: { reason: string }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/issues', {
      method: 'POST',
      body: { type: 'device', reason: payload.reason, description: payload.reason },
    });
  },
};
