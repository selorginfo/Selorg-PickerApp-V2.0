import type { KeyValue } from '../types';

export const mockDevice = {
  id: '',
  model: '',
  status: '',
  battery: null,
  lastSynced: null,
};

export const mockDeviceRows: KeyValue[] = [];

/** Static reason labels only — not live business data. */
export const deviceIssueReasons = [
  'Device won’t turn on',
  'Scanner / camera not working',
  'Battery draining fast',
  'Screen damage',
  'Other',
];
