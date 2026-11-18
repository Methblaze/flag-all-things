import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { DEFAULT_PREFS, type Product, type ScanHistoryItem, type UserPreferences, type Verdict } from '@/domain/types';

export const HISTORY_CAP = 200;
const HISTORY_KEY = 'fat:history:v1';
const PREFS_KEY = 'fat:prefs:v1';
const API_KEY = 'fat:anthropic-key';
const DAY_MS = 86_400_000;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback; // corrupt or unreadable storage must not crash the app
  }
}

export async function loadHistory(): Promise<ScanHistoryItem[]> {
  const items = await readJson<unknown>(HISTORY_KEY, []);
  return Array.isArray(items) ? (items as ScanHistoryItem[]) : [];
}

async function writeHistory(items: ScanHistoryItem[]): Promise<ScanHistoryItem[]> {
  const next = [...items].sort((a, b) => b.scannedAt - a.scannedAt).slice(0, HISTORY_CAP);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)); // rejects on quota errors; caller decides
  return next;
}

export async function saveScan(product: Product, verdict: Verdict, now = Date.now()): Promise<ScanHistoryItem[]> {
  const id = product.barcode ?? `label:${now}`;
  const items = (await loadHistory()).filter(i => i.id !== id);
  return writeHistory([{ id, product, verdict, scannedAt: now }, ...items]);
}

export async function removeScan(id: string): Promise<ScanHistoryItem[]> {
  return writeHistory((await loadHistory()).filter(i => i.id !== id));
}

export async function restoreScan(item: ScanHistoryItem): Promise<ScanHistoryItem[]> {
  return writeHistory([item, ...(await loadHistory()).filter(i => i.id !== item.id)]);
}

export async function findCached(barcode: string): Promise<Product | null> {
  return (await loadHistory()).find(i => i.id === barcode)?.product ?? null;
}

export const isStale = (p: Product, now: number) => now - p.fetchedAt > DAY_MS;

export async function loadPrefs(): Promise<UserPreferences> {
  const stored = await readJson<unknown>(PREFS_KEY, {});
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? { ...DEFAULT_PREFS, ...(stored as Partial<UserPreferences>) } : DEFAULT_PREFS;
}

export async function savePrefs(p: UserPreferences): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

// The key stays on this device: Keychain/Keystore on native, this browser's localStorage on web.
export async function getApiKey(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return globalThis.localStorage?.getItem(API_KEY) ?? null; } catch { return null; }
  }
  return SecureStore.getItemAsync(API_KEY);
}

export async function setApiKey(key: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    // Throws in private mode / blocked storage so Settings can say the key was not saved.
    if (key) globalThis.localStorage.setItem(API_KEY, key); else globalThis.localStorage.removeItem(API_KEY);
    return;
  }
  if (key) await SecureStore.setItemAsync(API_KEY, key);
  else await SecureStore.deleteItemAsync(API_KEY);
}
