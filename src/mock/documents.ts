import type { DocItem } from '../types';
import type { KycDocumentType } from '../types/api';

export type DocDef = {
  code: KycDocumentType;
  label: string;
  /** Shown under the title when nothing uploaded yet. */
  sub: string;
};

/** Profile documents are one photo each. Onboarding Aadhaar/PAN are stored as a single file. */
export const TWO_SIDED_DOC_CODES: readonly KycDocumentType[] = [];

/** Order matches the Documents screen: Aadhaar → PAN → Driving licence. */
export const DOC_LIST: DocDef[] = [
  { code: 'aadhar', label: 'Aadhaar card', sub: 'Uploaded during onboarding' },
  { code: 'pan', label: 'PAN card', sub: 'Uploaded during onboarding' },
  { code: 'dl', label: 'Driving licence', sub: 'Not uploaded' },
];

export const mockDocuments: DocItem[] = [
  { id: 'aadhar', name: 'Aadhaar card', num: '•••• •••• 1234', verified: true, pending: false },
  { id: 'pan', name: 'PAN card', num: 'ABCDE••••F', verified: true, pending: false },
  { id: 'dl', name: 'Driving licence', num: 'Not uploaded', verified: false, pending: true },
];
