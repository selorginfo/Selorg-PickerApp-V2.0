import type { Payout } from '../types';

export const mockWalletSummary = {
  month: 'March 2026',
  netPayout: '₹18,450',
  payDate: '5 Apr 2026',
  available: '₹4,850',
  availableAmount: 4850,
  bankLabel: 'HDFC ••7821',
  bankVerified: true,
  bankStatus: 'verified' as const,
  bankSubmittedAt: '2026-02-28T06:00:00.000Z',
  bankRejectionReason: null,
  upiVerified: false,
  upiStatus: 'pending' as const,
  upiSubmittedAt: '2026-03-10T06:00:00.000Z',
  upiRejectionReason: null,
};

export const mockPayouts: Payout[] = [
  { month: 'February 2026', date: '5 Mar 2026', mode: 'Bank transfer', amt: '₹17,200' },
  { month: 'January 2026', date: '5 Feb 2026', mode: 'Bank transfer', amt: '₹16,850' },
  { month: 'December 2025', date: '5 Jan 2026', mode: 'Bank transfer', amt: '₹15,940' },
];

export const bankFields = [
  { k: 'Account Holder', v: 'Rahul Verma' },
  { k: 'Bank Name', v: 'HDFC Bank' },
  { k: 'Account Number', v: '••••••••4821' },
  { k: 'IFSC Code', v: 'HDFC0001234' },
];
