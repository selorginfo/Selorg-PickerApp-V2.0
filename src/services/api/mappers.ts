import type {
  AssignedDeviceDto,
  ChatThreadDto,
  DocumentDto,
  HubDto,
  OnboardingStateDto,
  OnboardingStateValue,
  TrainingModuleDto,
  WorkLocation,
} from '../../types/api';
import type { ChatMessage, DocItem, StatusGate } from '../../types';
import { DOC_LIST } from '../../mock/documents';
import { parseDisplayDob } from '../../utils/validators';

export function mapHubToWorkLocation(hub: HubDto): WorkLocation {
  const title = hub.title || hub.name || hub.id;
  const sub =
    hub.sub ||
    [hub.distanceDisplay, hub.address].filter(Boolean).join(' · ') ||
    title;
  return { id: hub.id, title, sub };
}

export function mapTrainingModule(m: TrainingModuleDto): TrainingModuleDto {
  return {
    ...m,
    name: m.name || m.title || 'Training module',
    dur: m.dur || (m.durationSeconds != null ? `${Math.max(1, Math.round(m.durationSeconds / 60))} min` : ''),
  };
}

const DOC_LABEL: Record<string, string> = {
  ...Object.fromEntries(DOC_LIST.map(d => [d.code, d.label])),
  aadhaar: 'Aadhaar card',
};

export function normalizeKycDocType(raw: string | undefined | null): string {
  const t = String(raw || '').toLowerCase().replace(/[_-\s]/g, '');
  if (t === 'aadhaar' || t === 'aadhar' || t === 'aadhaarcard' || t === 'aadharcard') return 'aadhar';
  if (t === 'pan' || t === 'pancard') return 'pan';
  if (t === 'dl' || t === 'drivinglicence' || t === 'drivinglicense' || t === 'licence' || t === 'license') {
    return 'dl';
  }
  return String(raw || '').toLowerCase();
}

export function maskKycNumber(type: string, value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/[•*]/.test(raw)) return raw;
  const code = normalizeKycDocType(type);
  const n = raw.replace(/\s/g, '').toUpperCase();
  if (code === 'aadhar') {
    const digits = n.replace(/\D/g, '');
    if (digits.length >= 4) return `•••• •••• ${digits.slice(-4)}`;
  }
  if (code === 'pan' && n.length >= 6) return `${n.slice(0, 5)}••••${n.slice(-1)}`;
  if (n.length > 4) return `•••• ${n.slice(-4)}`;
  return raw;
}

export function mapDocumentDtos(docs: unknown): DocumentDto[] {
  if (!Array.isArray(docs)) return [];
  return docs.map(d => {
    const row = d as Partial<DocumentDto> & { _id?: string; number?: string };
    const type = normalizeKycDocType(row.type);
    const mimeType = row.mimeType || 'image/jpeg';
    const base64 = row.base64 ? String(row.base64).replace(/^data:[^;]+;base64,/i, '') : undefined;
    const url =
      row.url ||
      (base64 ? `data:${mimeType};base64,${base64}` : undefined);
    return {
      id: String(row.id || row._id || ''),
      _id: row._id,
      type,
      side: row.side === 'front' || row.side === 'back' ? row.side : row.side ?? null,
      url,
      base64,
      mimeType: base64 || row.url ? mimeType : undefined,
      fileName: row.fileName,
      status: String(row.status || 'pending').toLowerCase(),
      documentNumber: maskKycNumber(type, row.documentNumber || row.number),
      rejectionReason: row.rejectionReason ?? null,
      reviewedAt: row.reviewedAt ?? null,
      createdAt: row.createdAt,
      uploadedAt: row.uploadedAt,
    };
  });
}

export function mapDocuments(docs: unknown): DocItem[] {
  const rows = mapDocumentDtos(docs);
  if (!rows.length) return [];

  // Collapse front/back rows into one DocItem per type for legacy consumers.
  const byType = new Map<string, DocumentDto[]>();
  for (const row of rows) {
    const list = byType.get(row.type) || [];
    list.push(row);
    byType.set(row.type, list);
  }

  return Array.from(byType.entries()).map(([type, group]) => {
    const approved = group.every(g => g.status === 'approved' || g.status === 'verified');
    const hasUrl = group.some(g => !!g.url);
    const num =
      group.find(g => g.documentNumber)?.documentNumber ||
      (hasUrl ? 'Uploaded' : 'Not uploaded');
    return {
      id: type,
      name: DOC_LABEL[type] || type.toUpperCase(),
      num,
      verified: approved,
      pending: !approved,
    };
  });
}

export function mapDeviceResponse(raw: unknown): AssignedDeviceDto {
  if (!raw || typeof raw !== 'object') return { device: null, rows: [] };
  const obj = raw as Record<string, unknown>;
  if ('device' in obj || 'rows' in obj) {
    return {
      device: (obj.device as AssignedDeviceDto['device']) ?? null,
      rows: Array.isArray(obj.rows) ? (obj.rows as AssignedDeviceDto['rows']) : [],
    };
  }
  // Legacy flat device shape
  if (typeof obj.id === 'string') {
    return {
      device: {
        id: obj.id,
        model: typeof obj.model === 'string' ? obj.model : 'Handheld',
        status: 'Active',
        battery: null,
        lastSynced: null,
      },
      rows: [],
    };
  }
  return { device: null, rows: [] };
}

export function mapChatMessages(thread: ChatThreadDto | null | undefined): ChatMessage[] {
  if (!thread?.messages?.length) return [];
  return thread.messages.map((m) => ({
    who: m.me ? 'me' : 'agent',
    text: m.text,
    time: formatClock(m.createdAt),
  }));
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

/** Convert UI DOB (`DD / MM / YYYY` or `DD/MM/YYYY`) to `YYYY-MM-DD`. */
export function toIsoDob(input: string): string {
  const parsed = parseDisplayDob(input);
  if (parsed) return parsed.iso;
  return String(input || '').trim();
}

export function locationTypeToApi(value: string): 'warehouse' | 'darkstore' {
  const v = value.trim().toLowerCase();
  if (v === 'warehouse') return 'warehouse';
  return 'darkstore';
}

export function onboardingStateToGate(state: OnboardingStateValue | string | null | undefined): StatusGate {
  const raw = String(state || '').toUpperCase().replace(/-/g, '_');
  switch (raw) {
    case 'ACTIVE':
    case 'APPROVED':
      return 'approved';
    case 'REJECTED':
      return 'rejected';
    case 'BLOCKED':
    case 'INACTIVE':
    case 'DELETION_PENDING':
      return 'blocked';
    case 'SUSPENDED':
      return 'suspended';
    case 'ONBOARDING':
    case 'PENDING':
    case 'UNDER_REVIEW':
    case 'IN_PROGRESS':
    case 'NOT_STARTED':
    default:
      return 'under_review';
  }
}

/** Single source-of-truth mapping from GET /onboarding/state → UI gate. */
export function mapApplicationStatus(dto: OnboardingStateDto | null | undefined): StatusGate {
  return onboardingStateToGate(dto?.state || dto?.accountStatus);
}

function normalizeVerificationStatus(raw: string | undefined, done?: boolean): { status: string; done: boolean } {
  const s = String(raw || '').trim();
  const lower = s.toLowerCase();
  if (done === true || lower === 'done' || lower === 'approved' || lower === 'verified' || lower === 'complete') {
    return { status: 'Done', done: true };
  }
  if (lower === 'verifying' || lower === 'in_review' || lower === 'under_review' || lower === 'pending_review') {
    return { status: 'Verifying', done: false };
  }
  if (lower === 'pending' || lower === 'missing' || !s) {
    return { status: 'Pending', done: false };
  }
  return { status: s, done: Boolean(done) };
}

export function mapVerificationSteps(dto: OnboardingStateDto | null | undefined): {
  key: string;
  label: string;
  status: string;
  done: boolean;
}[] {
  const rows = dto?.verification;
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((row, i) => {
      const mapped = normalizeVerificationStatus(row.status, row.done);
      return {
        key: row.key || String(i),
        label: row.label || row.key || 'Step',
        status: mapped.status,
        done: mapped.done,
      };
    });
  }

  if (!dto) return [];

  const completed = dto.completedSteps || [];
  const docs = dto.documents || [];
  const aadhaar = docs.find(d => ['aadhar', 'aadhaar'].includes(String(d.type || '').toLowerCase()));
  const pan = docs.find(d => String(d.type || '').toLowerCase() === 'pan');
  const submitted = Boolean(dto.submittedForReviewAt);
  const kycDone = aadhaar?.status === 'approved' && pan?.status === 'approved';
  const kycStarted = Boolean(aadhaar || pan || completed.includes(6));
  const docsDone = kycStarted || docs.length > 0 || completed.includes(6);
  const approved = String(dto.state || '').toUpperCase() === 'ACTIVE';
  const kycStatus = kycDone ? 'Done' : kycStarted ? 'Verifying' : 'Pending';

  return [
    { key: 'documents', label: 'Documents submitted', status: docsDone ? 'Done' : 'Pending', done: docsDone },
    { key: 'kyc', label: 'Aadhaar & PAN KYC', status: kycStatus, done: kycDone },
    { key: 'face', label: 'Face verification', status: submitted ? 'Verifying' : 'Pending', done: false },
    { key: 'approval', label: 'Manager approval', status: approved ? 'Done' : 'Pending', done: approved },
  ];
}

export function mapApplicationSnapshot(dto: OnboardingStateDto | null | undefined) {
  return {
    rejectionReason: dto?.rejectionReason?.trim() || null,
    statusMessage: dto?.statusMessage?.trim() || dto?.rejectionReason?.trim() || null,
    verification: mapVerificationSteps(dto),
    nextAction: dto?.nextAction ?? null,
    canReapply: Boolean(dto?.canReapply),
  };
}

export function resolvePostLoginRoute(ob: OnboardingStateDto | null | undefined, nextScreen?: string): 'Main' | 'Onboarding' {
  const dest = resolvePostAuthDestination({ dto: ob, nextScreen, isNewUser: false, intent: 'login' });
  return dest === 'Main' ? 'Main' : 'Onboarding';
}

export type PostAuthDestination = 'Main' | 'Onboarding' | 'Status';

/**
 * Route after OTP verify or session restore.
 * - Main only when ACTIVE / nextScreen=main, or fail-open when DTO is missing for a returning login.
 * - Incomplete onboarding and pending review never skip to Main.
 * - Approved accounts with bank_details / collect_device land on Status.
 */
export function resolvePostAuthDestination(opts: {
  dto?: OnboardingStateDto | null;
  nextScreen?: string;
  isNewUser?: boolean;
  intent?: 'login' | 'signup';
}): PostAuthDestination {
  const gate = mapApplicationStatus(opts.dto);
  if (gate === 'rejected' || gate === 'blocked' || gate === 'suspended') return 'Status';

  const state = String(opts.dto?.state || '').toUpperCase();
  if (state === 'ACTIVE' || opts.nextScreen === 'main') return 'Main';

  if (gate === 'approved') {
    const next = opts.dto?.nextAction;
    if (next === 'bank_details' || next === 'collect_device') return 'Status';
    return 'Main';
  }

  const submitted = Boolean(opts.dto?.submittedForReviewAt) || opts.nextScreen === 'pending_review';
  if (submitted) return 'Status';

  // Transient onboarding fetch failure: fail-open for returning sessions only.
  if (opts.dto == null && opts.intent === 'login' && opts.isNewUser === false) {
    return 'Main';
  }

  return 'Onboarding';
}

export function initialsFromName(name?: string | null): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'SP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}
