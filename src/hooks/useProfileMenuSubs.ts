import { useCallback, useEffect, useState } from 'react';
import { bankApi } from '../services/api/bankApi';
import { documentApi } from '../services/api/documentApi';
import { profileApi } from '../services/api/profileApi';
import { trainingApi } from '../services/api/trainingApi';
import { profileMenuBase } from '../mock/profile';

export type ProfileMenuRow = {
  key: string;
  icon: string;
  color: string;
  bg: string;
  title: string;
  sub: string;
  target: (typeof profileMenuBase)[number]['target'];
};

function maskBankLabel(bankName: string | null | undefined, masked: string | null | undefined): string {
  const bank = (bankName || 'Bank').trim();
  const digits = String(masked || '').replace(/\D/g, '');
  const tail = digits.slice(-4);
  if (tail) return `${bank} ••${tail}`;
  return bank;
}

/**
 * Builds Profile menu rows with subtitles from live device / bank / docs / training APIs.
 * Never shows hardcoded HHD-2231 / HDFC / 4-of-4 placeholders.
 */
export function useProfileMenuSubs() {
  const [rows, setRows] = useState<ProfileMenuRow[]>(() =>
    profileMenuBase.map(m => ({
      key: m.key,
      icon: m.icon,
      color: m.color,
      bg: m.bg,
      title: m.title,
      sub: m.subFallback,
      target: m.target,
    })),
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [deviceRes, bankRes, docsRes, trainRes, videosRes] = await Promise.allSettled([
      profileApi.getDevice(),
      bankApi.listAccounts(),
      documentApi.list(),
      trainingApi.getProgress(),
      trainingApi.listVideos(),
    ]);

    const device =
      deviceRes.status === 'fulfilled' ? deviceRes.value : { device: null, rows: [] as unknown[] };
    const banks = bankRes.status === 'fulfilled' && Array.isArray(bankRes.value) ? bankRes.value : [];
    const docs = docsRes.status === 'fulfilled' && Array.isArray(docsRes.value) ? docsRes.value : [];
    const train = trainRes.status === 'fulfilled' ? (trainRes.value as Record<string, unknown>) : null;
    const videos = videosRes.status === 'fulfilled' && Array.isArray(videosRes.value) ? videosRes.value : [];

    const deviceSub = device?.device?.id
      ? `${device.device.id} · ${device.device.status || 'Assigned'}`
      : 'No HHD assigned';

    const primary = banks.find(b => b.isPrimary) || banks[0];
    const bankSub = primary
      ? `${maskBankLabel(primary.bankName, primary.accountNumberMasked)}${
          primary.isVerified || primary.verificationStatus === 'verified' ? ' · Verified' : ' · Pending'
        }`
      : 'No bank account added';

    const verifiedDocs = docs.filter(d => Boolean(d.verified));
    const docsSub =
      docs.length === 0
        ? 'No documents uploaded'
        : verifiedDocs.length
          ? `${verifiedDocs.length} verified`
          : docs.some(d => d.pending)
            ? `${docs.length} uploaded · pending review`
            : `${docs.length} uploaded`;

    const completedFromList = videos.filter(v => Boolean((v as { done?: boolean; completed?: boolean }).done || (v as { completed?: boolean }).completed)).length;
    const completed = Array.isArray(train?.completed)
      ? (train!.completed as unknown[]).length
      : Number(train?.completedCount) || completedFromList;
    const total = videos.length || Number(train?.total) || Number(train?.totalVideos) || 0;
    const pct = typeof train?.percentage === 'number' ? Math.round(Number(train.percentage)) : null;
    const trainingSub =
      total > 0
        ? `${Math.min(completed, total)} of ${total} modules${pct != null ? ` · ${pct}%` : ''}`
        : pct != null
          ? `${pct}% complete`
          : completed > 0
            ? `${completed} modules complete`
            : 'No modules started';

    const subByKey: Record<string, string> = {
      device: deviceSub,
      bank: bankSub,
      documents: docsSub,
      training: trainingSub,
      personal: 'Phone, address & emergency',
      workHistory: 'Attendance & shift records',
      salary: 'Monthly pay, leave & OT',
      support: 'Help, FAQs & notifications',
    };

    setRows(
      profileMenuBase.map(m => ({
        key: m.key,
        icon: m.icon,
        color: m.color,
        bg: m.bg,
        title: m.title,
        sub: subByKey[m.key] || m.subFallback,
        target: m.target,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    reload().catch(() => setLoading(false));
  }, [reload]);

  return { rows, loading, reload };
}
