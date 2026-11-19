// Open Food Facts lookup. Verified live 2026-11-18:
//   v3 GET /api/v3/product/{code} → 200 {code, status: 'success', product, result, errors, warnings}; not found → HTTP 404 {status: 'failure'}
//   v2 GET /api/v2/product/{code}.json → 200 {code, status: 1, status_verbose, product}; deprecated, used only as fallback
// Outages can return an HTML page instead of JSON; that is treated like a 5xx.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { AllergenKey, Grade, Product } from '@/domain/types';

// Must be a URL, never an email: it is sent with every OFF request (design doc §5).
export const OFF_CONTACT = 'https://portfoliokjaer.vercel.app/';
const BASE = 'https://world.openfoodfacts.org';
export const OFF_FIELDS = [
  'code', 'product_name', 'product_name_da', 'product_name_en', 'brands', 'image_front_small_url',
  'ingredients_text', 'ingredients_text_da', 'ingredients_text_en', 'additives_tags', 'allergens_tags', 'traces_tags',
  'nova_group', 'nutriscore_grade', 'environmental_score_grade', 'ecoscore_grade', 'categories_tags',
  'ingredients_analysis_tags', 'labels_tags', 'nutriments',
].join(',');

export const EXAMPLE_BARCODES: { code: string; label: string }[] = [
  { code: '5701164710389', label: 'Sol Gryn oats' },
  { code: '5741000109151', label: 'Faxe Kondi' },
  { code: '5704000502391', label: 'Stryhns leverpostej' },
  { code: '5700426101019', label: 'Arla sødmælk' },
];

export type OffResult = { kind: 'found'; product: Product } | { kind: 'not-found' } | { kind: 'busy' } | { kind: 'offline' };

const OFF_ALLERGENS: Record<string, AllergenKey> = {
  'en:gluten': 'gluten', 'en:crustaceans': 'crustaceans', 'en:eggs': 'eggs', 'en:fish': 'fish',
  'en:peanuts': 'peanuts', 'en:soybeans': 'soy', 'en:milk': 'milk', 'en:nuts': 'nuts', 'en:celery': 'celery',
  'en:mustard': 'mustard', 'en:sesame-seeds': 'sesame', 'en:sulphur-dioxide-and-sulphites': 'sulphites',
  'en:lupin': 'lupin', 'en:molluscs': 'molluscs',
};

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const tags = (v: unknown) => (Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : []);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const grade = (v: unknown): Grade | null => (typeof v === 'string' && /^[a-e]$/.test(v) ? (v as Grade) : null);
const allergenKeys = (v: unknown) => [...new Set(tags(v).map(t => OFF_ALLERGENS[t]).filter(Boolean))];
const triState = (all: string[], yes: string, no: string) => (all.includes(yes) ? true : all.includes(no) ? false : null);

export function normalizeOff(raw: unknown, fetchedAt: number): Product | null {
  const r = (raw ?? {}) as Raw;
  const p = r.product as Raw | undefined;
  if (!p || typeof p !== 'object') return null;

  const anyName = Object.keys(p).filter(k => k.startsWith('product_name_')).map(k => str(p[k])).find(Boolean) ?? null;
  const ingredientsText = str(p.ingredients_text_da) ?? str(p.ingredients_text_en) ?? str(p.ingredients_text);
  const allergens = allergenKeys(p.allergens_tags);
  const nova = num(p.nova_group);
  const n = (p.nutriments ?? {}) as Raw;
  const analysis = [...tags(p.ingredients_analysis_tags), ...tags(p.labels_tags)];

  return {
    barcode: str(r.code) ?? str(p.code),
    name: str(p.product_name_da) ?? str(p.product_name) ?? str(p.product_name_en) ?? anyName,
    brand: str(p.brands)?.split(',')[0].trim() ?? null,
    imageUrl: str(p.image_front_small_url),
    ingredientsText,
    additives: tags(p.additives_tags).map(t => t.replace(/^en:/, '')).filter(t => /^e\d/.test(t)),
    allergens,
    traces: allergenKeys(p.traces_tags),
    allergenDataKnown: allergens.length > 0 || ingredientsText !== null,
    nova: nova === 1 || nova === 2 || nova === 3 || nova === 4 ? nova : null,
    nutriscore: grade(p.nutriscore_grade),
    ecoscore: grade(p.environmental_score_grade) ?? grade(p.ecoscore_grade),
    isBeverage: tags(p.categories_tags).includes('en:beverages'),
    nutrition: {
      energyKcal: num(n['energy-kcal_100g']), sugars: num(n.sugars_100g), saturatedFat: num(n['saturated-fat_100g']),
      salt: num(n.salt_100g), fiber: num(n.fiber_100g), protein: num(n.proteins_100g),
    },
    diet: {
      vegan: triState(analysis, 'en:vegan', 'en:non-vegan'),
      vegetarian: triState(analysis, 'en:vegetarian', 'en:non-vegetarian'),
      palmOil: triState(analysis, 'en:palm-oil', 'en:palm-oil-free'),
    },
    source: 'off',
    fetchedAt,
  };
}

type Attempt = OffResult | 'retry';

async function attempt(url: string, init: RequestInit, fetchImpl: typeof fetch, now: number, onNetworkError: Attempt, timeoutMs: number): Promise<Attempt> {
  // Weak in-store signal must end in the offline state, not an endless skeleton.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try { res = await fetchImpl(url, { ...init, signal: controller.signal }); } catch { return onNetworkError; } finally { clearTimeout(timer); }
  if (res.status === 404) return { kind: 'not-found' };
  if (res.status === 429) return { kind: 'busy' };
  if (!res.ok) return onNetworkError === 'retry' ? 'retry' : { kind: 'busy' };
  let body: Raw;
  try { body = await res.json(); } catch { return onNetworkError === 'retry' ? 'retry' : { kind: 'busy' }; }
  if (body.status === 'failure' || body.status === 0) return { kind: 'not-found' };
  const product = normalizeOff(body, now);
  return product ? { kind: 'found', product } : { kind: 'not-found' };
}

export async function fetchProduct(
  code: string,
  opts: { fetchImpl?: typeof fetch; platform?: 'web' | 'ios' | 'android'; now?: () => number; timeoutMs?: number } = {},
): Promise<OffResult> {
  const { fetchImpl = fetch, platform = Platform.OS as 'web' | 'ios' | 'android', now = Date.now, timeoutMs = 10_000 } = opts;
  const version = Constants.expoConfig?.version ?? '1.0.0';
  // Browsers forbid setting User-Agent; OFF accepts app_name/app_version instead.
  const query = `fields=${OFF_FIELDS}` + (platform === 'web' ? `&app_name=FlagAllThings&app_version=${version}` : '');
  const init: RequestInit = platform === 'web' ? {} : { headers: { 'User-Agent': `FlagAllThings/${version} (${OFF_CONTACT})` } };

  const v3 = await attempt(`${BASE}/api/v3/product/${code}?${query}`, init, fetchImpl, now(), 'retry', timeoutMs);
  if (v3 !== 'retry') return v3;
  const v2 = await attempt(`${BASE}/api/v2/product/${code}.json?${query}`, init, fetchImpl, now(), { kind: 'offline' }, timeoutMs);
  return v2 === 'retry' ? { kind: 'busy' } : v2;
}
