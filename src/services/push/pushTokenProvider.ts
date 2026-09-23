/**
 * Optional push registration bridge.
 * Call `setPushTokenProvider` from a future FCM/APNs module.
 * Without a provider, registration is skipped (never sends fake tokens).
 */
type PushTokenProvider = () => Promise<string | null | undefined>;

let provider: PushTokenProvider | null = null;

export function setPushTokenProvider(next: PushTokenProvider | null): void {
  provider = next;
}

export async function resolvePushToken(): Promise<string | null> {
  if (!provider) return null;
  try {
    const token = await provider();
    const trimmed = String(token || '').trim();
    return trimmed || null;
  } catch {
    return null;
  }
}
