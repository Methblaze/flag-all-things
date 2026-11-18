import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_PREFS } from '@/domain/types';
import { makeProduct } from '@/engine/__fixtures__/make';
import { findCached, getApiKey, isStale, loadHistory, loadPrefs, removeScan, restoreScan, saveScan, setApiKey } from '@/services/storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-secure-store', () => {
  const mem = new Map<string, string>();
  return {
    getItemAsync: async (k: string) => mem.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => { mem.set(k, v); },
    deleteItemAsync: async (k: string) => { mem.delete(k); },
  };
});

beforeEach(() => AsyncStorage.clear());

test('newest first, same id replaces', async () => {
  await saveScan(makeProduct({ barcode: 'a' }), 'ok', 1); await saveScan(makeProduct({ barcode: 'b' }), 'ok', 2);
  const h = await saveScan(makeProduct({ barcode: 'a' }), 'caution', 3);
  expect(h.map(i => [i.id, i.verdict])).toEqual([['a', 'caution'], ['b', 'ok']]);
});
test('label read without barcode gets a label id', async () => expect((await saveScan(makeProduct({ barcode: null, source: 'label-ai' }), 'ok', 42))[0].id).toBe('label:42'));
test('capped at 200', async () => { for (let i = 0; i < 205; i++) await saveScan(makeProduct({ barcode: String(i) }), 'ok', i); expect((await loadHistory()).length).toBe(200); });
test('remove then restore keeps the original position', async () => {
  await saveScan(makeProduct({ barcode: 'a' }), 'ok', 1); await saveScan(makeProduct({ barcode: 'b' }), 'ok', 2); await saveScan(makeProduct({ barcode: 'c' }), 'ok', 3);
  const item = (await loadHistory()).find(i => i.id === 'b')!;
  expect((await removeScan('b')).map(i => i.id)).toEqual(['c', 'a']);
  expect((await restoreScan(item)).map(i => i.id)).toEqual(['c', 'b', 'a']);
});
test('findCached', async () => { await saveScan(makeProduct({ barcode: 'x', name: 'Skyr' }), 'ok', 1); expect((await findCached('x'))?.name).toBe('Skyr'); expect(await findCached('nope')).toBeNull(); });
test('corrupt history JSON → []', async () => { await AsyncStorage.setItem('fat:history:v1', '{oops'); expect(await loadHistory()).toEqual([]); });
test('save failure rejects and leaves stored history intact', async () => {
  await saveScan(makeProduct({ barcode: 'a' }), 'ok', 1);
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('QuotaExceeded'));
  await expect(saveScan(makeProduct({ barcode: 'b' }), 'ok', 2)).rejects.toThrow('QuotaExceeded');
  expect((await loadHistory()).map(i => i.id)).toEqual(['a']);
});
test('prefs default and merge', async () => {
  expect(await loadPrefs()).toEqual(DEFAULT_PREFS);
  await AsyncStorage.setItem('fat:prefs:v1', JSON.stringify({ diet: 'vegan' }));
  expect(await loadPrefs()).toEqual({ ...DEFAULT_PREFS, diet: 'vegan' });
});
test('corrupt prefs → defaults', async () => { await AsyncStorage.setItem('fat:prefs:v1', 'nope'); expect(await loadPrefs()).toEqual(DEFAULT_PREFS); });
test('isStale at 24h', () => { expect(isStale(makeProduct({ fetchedAt: 0 }), 86_400_000)).toBe(false); expect(isStale(makeProduct({ fetchedAt: 0 }), 86_400_001)).toBe(true); });
test('api key round trip, null clears', async () => { await setApiKey('sk-test'); expect(await getApiKey()).toBe('sk-test'); await setApiKey(null); expect(await getApiKey()).toBeNull(); });
