import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import { mapHubToWorkLocation, mapTrainingModule, locationTypeToApi } from './mappers';
import { normalizePickerGender } from '../../utils/gender';
import type { HubDto, OnboardingStateDto, ShiftOption, TrainingModuleDto, WorkLocation } from '../../types/api';

export const onboardingApi = {
  async getLocations(query?: { type?: string; lat?: number; lng?: number }): Promise<WorkLocation[]> {
    if (config.USE_MOCKS) {
      return mockResponse([
        { id: 'hub-1', title: 'Indiranagar Darkstore', sub: '2.1 km · 80 Ft Rd' },
      ]);
    }
    const hubs = await request<HubDto[]>('/work-locations', {
      auth: false,
      query: {
        type: query?.type,
        lat: query?.lat,
        lng: query?.lng,
      },
    });
    return (Array.isArray(hubs) ? hubs : []).map(mapHubToWorkLocation);
  },

  async getShifts(query?: { warehouseKey?: string }): Promise<ShiftOption[]> {
    if (config.USE_MOCKS) {
      return mockResponse([{ id: 'shift-1', title: 'Full day · 12:00 AM – 11:59 PM', sub: '24h · always open' }]);
    }
    const rows = await request<Array<ShiftOption & { id?: string; _id?: string }>>('/shifts/available', {
      query: { warehouseKey: query?.warehouseKey },
    });
    return (Array.isArray(rows) ? rows : []).map((s) => ({
      id: String(s.id || s._id || ''),
      title: s.title || 'Shift',
      sub: s.sub || '',
    }));
  },

  async getTraining(): Promise<TrainingModuleDto[]> {
    if (config.USE_MOCKS) {
      return mockResponse([{ name: 'Safety basics', dur: '8 min', videoId: 'safety' }]);
    }
    const rows = await request<TrainingModuleDto[]>('/training/videos');
    return (Array.isArray(rows) ? rows : []).map(mapTrainingModule);
  },

  getState() {
    if (config.USE_MOCKS) return mockResponse<OnboardingStateDto>({ state: 'ONBOARDING' });
    return request<OnboardingStateDto>('/onboarding/state');
  },

  submitProfile(data: Record<string, unknown>) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    const body = { ...data };
    if (typeof body.gender === 'string') {
      const gender = normalizePickerGender(body.gender);
      if (gender) body.gender = gender;
      else delete body.gender;
    }
    return request('/user/profile', { method: 'PUT', body });
  },

  submitLocationType(locationType: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/user/location-type', {
      method: 'PUT',
      body: { locationType: locationTypeToApi(locationType) },
    });
  },

  setWorkLocation(hubId: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/locations/set', { method: 'POST', body: { hubId } });
  },

  setDarkstoreFromCurrent(body?: Record<string, unknown>) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/locations/set-darkstore-from-current', { method: 'POST', body: body ?? {} });
  },

  selectShift(shiftId: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/shifts/select', { method: 'POST', body: { shiftId } });
  },

  completeTrainingVideo(videoId: string) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request(`/training/complete/${encodeURIComponent(videoId)}`, { method: 'POST' });
  },

  submitKyc(data: {
    aadhaar?: string;
    pan?: string;
    aadhaarUrl?: string;
    panUrl?: string;
    aadhaarFileName?: string;
    panFileName?: string;
  }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/documents/upload', {
      method: 'POST',
      body: {
        aadhaar: data.aadhaar,
        pan: data.pan,
        aadhaarUrl: data.aadhaarUrl,
        panUrl: data.panUrl,
        aadhaarFileName: data.aadhaarFileName,
        panFileName: data.panFileName,
      },
    });
  },

  /**
   * Upload KYC card via multipart (reliable on Android) + Base64 field.
   * Backend stores Base64 in MongoDB and returns a data URI for preview.
   */
  uploadKycCard(
    payload: {
      base64: string;
      ocrType: 'aadhaar' | 'pan';
      fileName?: string;
      mimeType?: string;
      /** Local file/content URI from the image picker — preferred transport on device. */
      uri?: string;
    },
  ): Promise<{
    url: string;
    base64?: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    ocrNumber?: string | null;
    ocrText?: string;
    id?: string;
  }> {
    if (config.USE_MOCKS) {
      throw new Error('Mock KYC upload is disabled — use the real API');
    }

    const ext = (payload.fileName || '').split('.').pop()?.toLowerCase();
    const mime =
      payload.mimeType ||
      (ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'heic' || ext === 'heif'
            ? 'image/heic'
            : 'image/jpeg');
    const name =
      payload.fileName ||
      `${payload.ocrType}.${ext === 'png' || ext === 'webp' || ext === 'heic' ? ext : 'jpg'}`;

    // JSON Base64 only — multipart+huge Base64 fields were unreliable on Android,
    // and the API stores Base64 in MongoDB as the source of truth.
    return request('/uploads', {
      method: 'POST',
      body: {
        base64: payload.base64,
        purpose: 'document',
        ocrType: payload.ocrType,
        fileName: name,
        mimeType: mime,
      },
      timeoutMs: 60_000,
    });
  },

  verifyFace(data: { imageUrl?: string; url?: string; source?: string } = {}) {
    if (config.USE_MOCKS) return mockResponse({ ok: true, verified: true });
    return request('/verify/face', {
      method: 'POST',
      body: {
        imageUrl: data.imageUrl || data.url,
        url: data.url || data.imageUrl,
        source: data.source,
      },
    });
  },

  addBankAccount(data: { holder?: string; bank?: string; acc?: string; ifsc?: string; accountNumber?: string; ifscCode?: string; holderName?: string; bankName?: string }) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/bank/accounts', {
      method: 'POST',
      body: {
        holder: data.holder || data.holderName,
        bank: data.bank || data.bankName,
        acc: data.acc || data.accountNumber,
        ifsc: data.ifsc || data.ifscCode,
      },
    });
  },

  requestManagerOtp() {
    if (config.USE_MOCKS) return mockResponse({ sent: true });
    return request('/manager/request-otp', { method: 'POST' });
  },

  verifyManagerOtp(payload: { otp: string }) {
    if (config.USE_MOCKS) return mockResponse({ verified: true });
    return request('/manager/verify-otp', { method: 'POST', body: payload });
  },

  /** Verify manager OTP then assign the HHD. */
  async confirmDeviceCollection(payload: { otp: string; deviceId?: string }) {
    if (config.USE_MOCKS) return mockResponse({ acknowledged: true, deviceId: 'HHD-DEMO' });
    await request('/manager/verify-otp', { method: 'POST', body: { otp: payload.otp } });
    return request<{ acknowledged: boolean; deviceId: string }>('/devices/collection-complete', {
      method: 'POST',
      body: payload.deviceId ? { deviceId: payload.deviceId } : {},
    });
  },

  registerAtDarkStore(payload: { storeId?: string; hubId?: string }) {
    if (config.USE_MOCKS) return mockResponse({ registered: true });
    return request('/dark-store-login', {
      method: 'POST',
      body: { hubId: payload.hubId || payload.storeId },
    });
  },

  /** Formal application submit — POST /onboarding/submit (not /verify/face). */
  submitForReview(data?: { acceptedTermsVersion?: string; acceptedPrivacyVersion?: string }) {
    if (config.USE_MOCKS) {
      return mockResponse<OnboardingStateDto>({
        state: 'ONBOARDING',
        submittedForReviewAt: new Date().toISOString(),
        nextAction: 'bank_details',
      });
    }
    return request<OnboardingStateDto>('/onboarding/submit', {
      method: 'POST',
      body: data ?? {},
    });
  },

  complete(data?: Record<string, unknown>) {
    if (config.USE_MOCKS) return mockResponse({ ok: true });
    return request('/bank/accounts', { method: 'POST', body: data ?? {} });
  },
};
