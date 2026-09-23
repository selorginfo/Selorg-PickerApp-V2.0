import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@selorg-picker/';

export const storageService = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* noop */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch {
      /* noop */
    }
  },
  async loadPartial<K extends string>(keys: readonly K[]): Promise<Record<K, unknown>> {
    const out = {} as Record<K, unknown>;
    for (const k of keys) {
      const v = await this.get(k);
      if (v != null) out[k] = v;
    }
    return out;
  },
  async savePartial(subset: Record<string, unknown>): Promise<void> {
    for (const [k, v] of Object.entries(subset)) await this.set(k, v);
  },
};
