import { calmCaps, normalizeOff, fetchProduct, EXAMPLE_BARCODES } from '@/services/off';

const fixture = (name: string) => require(`../__fixtures__/off/${name}.json`);

test('normalises a real Danish v3 product', () => {
  const p = normalizeOff(fixture('5701164710389'), 1)!;
  expect(p).toMatchObject({ barcode: '5701164710389', source: 'off', fetchedAt: 1, nova: 1, nutriscore: 'a' });
  expect(p.name).toBeTruthy(); expect(p.ingredientsText).toMatch(/havre/i);
});
test('real leverpostej: tags, allergens and diet mapped', () =>
  expect(normalizeOff(fixture('5704000502391'), 0)).toMatchObject({
    additives: ['e200', 'e301', 'e451'], allergens: ['fish', 'gluten', 'milk'], allergenDataKnown: true,
    diet: { vegan: false, vegetarian: false, palmOil: false }, ecoscore: null, nova: 4,
  }));
test('normalises a v2 response the same way', () => expect(normalizeOff(fixture('v2-5741000109151'), 0)).toMatchObject({ barcode: '5741000109151', isBeverage: true }));
test('tag prefixes stripped, unknown tags dropped, odd grades → null', () => {
  const p = normalizeOff({ code: '5701234567899', product: { additives_tags: ['en:e322i'], allergens_tags: ['en:milk', 'en:nuts', 'en:banana'], nutriscore_grade: 'not-applicable', environmental_score_grade: 'b', categories_tags: ['en:beverages'] } }, 0)!;
  expect(p).toMatchObject({ additives: ['e322i'], allergens: ['milk', 'nuts'], nutriscore: null, ecoscore: 'b', isBeverage: true, allergenDataKnown: true });
});
test('name-only partial record', () => expect(normalizeOff(fixture('partial-name-only'), 0)).toMatchObject({ name: 'Pain', nutriscore: null, ingredientsText: null, allergenDataKnown: false }));
test('no product → null', () => expect(normalizeOff(fixture('not-found'), 0)).toBeNull());
test('example barcodes all have fixtures', () => {
  expect(EXAMPLE_BARCODES.length).toBeGreaterThanOrEqual(3);
  for (const e of EXAMPLE_BARCODES) expect(normalizeOff(fixture(e.code), 0)?.barcode).toBe(e.code);
});

const res = (status: number, body: unknown) => Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }));
test('v3 hit → found, no v2 call', async () => {
  const f = jest.fn(() => res(200, fixture('5701164710389')));
  expect((await fetchProduct('5701164710389', { fetchImpl: f, platform: 'ios' })).kind).toBe('found');
  expect(f).toHaveBeenCalledTimes(1);
});
test('v3 404 → not-found, no v2 call', async () => { const f = jest.fn(() => res(404, fixture('not-found'))); expect(await fetchProduct('5701234567899', { fetchImpl: f })).toEqual({ kind: 'not-found' }); expect(f).toHaveBeenCalledTimes(1); });
test('network error on v3 → v2 fallback', async () => {
  const f = jest.fn().mockRejectedValueOnce(new TypeError('net')).mockImplementationOnce(() => res(200, fixture('v2-5741000109151')));
  expect((await fetchProduct('5741000109151', { fetchImpl: f })).kind).toBe('found'); expect(f.mock.calls[1][0]).toContain('/api/v2/');
});
test('HTML error page on v3 → v2 fallback', async () => {
  const f = jest.fn().mockImplementationOnce(() => res(200, '<!DOCTYPE html>Page temporarily unavailable')).mockImplementationOnce(() => res(200, fixture('v2-5741000109151')));
  expect((await fetchProduct('5741000109151', { fetchImpl: f })).kind).toBe('found');
});
test('both fail on network → offline', async () => expect(await fetchProduct('5701234567899', { fetchImpl: jest.fn().mockRejectedValue(new TypeError('net')) })).toEqual({ kind: 'offline' }));
test('429 → busy, no fallback', async () => { const f = jest.fn(() => res(429, {})); expect(await fetchProduct('5701234567899', { fetchImpl: f })).toEqual({ kind: 'busy' }); expect(f).toHaveBeenCalledTimes(1); });
test('503 then 503 → busy', async () => expect(await fetchProduct('5701234567899', { fetchImpl: jest.fn(() => res(503, {})) })).toEqual({ kind: 'busy' }));
test('web identifies by query string, native by User-Agent', async () => {
  const f = jest.fn((_url: string, _init?: RequestInit) => res(404, {}));
  await fetchProduct('5701234567899', { fetchImpl: f as unknown as typeof fetch, platform: 'web' });
  expect(f.mock.calls[0][0]).toMatch(/app_name=FoodFlag/);
  expect((f.mock.calls[0][1]?.headers as Record<string, string> | undefined)?.['User-Agent']).toBeUndefined();
  await fetchProduct('5701234567899', { fetchImpl: f as unknown as typeof fetch, platform: 'ios' });
  expect((f.mock.calls[1][1]!.headers as Record<string, string>)['User-Agent']).toMatch(/^FoodFlag\/\d+\.\d+\.\d+ \(https:/);
});
test('a lookup that never answers times out to offline instead of hanging', async () => {
  const hang = jest.fn((_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  expect(await fetchProduct('5701234567899', { fetchImpl: hang as unknown as typeof fetch, timeoutMs: 20 })).toEqual({ kind: 'offline' });
  expect(hang).toHaveBeenCalledTimes(2);
}, 2000);

test('all-caps names are title-cased; mixed case and words with digits are kept', () => {
  expect(calmCaps('SOL GRYN')).toBe('Sol Gryn');
  expect(calmCaps('ØKOLOGISK SØDMÆLK')).toBe('Økologisk Sødmælk');
  expect(calmCaps('COCA-COLA 1,5L')).toBe('Coca-Cola 1,5L');
  expect(calmCaps('Grovhakket leverpostej')).toBe('Grovhakket leverpostej');
  expect(calmCaps('OK')).toBe('OK');
  expect(calmCaps(null)).toBeNull();
});
