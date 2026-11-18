// Data models from the design doc §8. Rules (§9) are pure functions of these.
export type AllergenKey =
  | 'gluten' | 'crustaceans' | 'eggs' | 'fish' | 'peanuts' | 'soy' | 'milk' | 'nuts'
  | 'celery' | 'mustard' | 'sesame' | 'sulphites' | 'lupin' | 'molluscs';
export type Grade = 'a' | 'b' | 'c' | 'd' | 'e';
export type ProductSource = 'off' | 'label-ai' | 'example';

export interface Nutrition {
  energyKcal: number | null;
  sugars: number | null;
  saturatedFat: number | null;
  salt: number | null;
  fiber: number | null;
  protein: number | null;
}

export interface Product {
  barcode: string | null;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  ingredientsText: string | null;
  additives: string[];
  allergens: AllergenKey[];
  traces: AllergenKey[];
  allergenDataKnown: boolean;
  nova: 1 | 2 | 3 | 4 | null;
  nutriscore: Grade | null;
  ecoscore: Grade | null;
  isBeverage: boolean;
  nutrition: Nutrition;
  diet: { vegan: boolean | null; vegetarian: boolean | null; palmOil: boolean | null };
  source: ProductSource;
  fetchedAt: number;
}

export type Severity = 'danger' | 'warning' | 'info' | 'good';
export type FlagCategory = 'processing' | 'additives' | 'nutrition' | 'allergens' | 'diet';

export interface Flag {
  id: string;
  category: FlagCategory;
  severity: Severity;
  title: string;
  detail: string;
  source?: { label: string; url: string };
  personal: boolean;
}

export type Verdict = 'avoid' | 'caution' | 'ok' | 'good' | 'unknown';

export interface FlagReport {
  verdict: Verdict;
  headline: string;
  counts: Record<Severity, number>;
  flags: Flag[];
  missing: FlagCategory[];
}

export interface UserPreferences {
  allergens: AllergenKey[];
  additiveAlerts: string[];
  novaAlert: 3 | 4 | null;
  diet: 'none' | 'vegetarian' | 'vegan';
  avoidPalmOil: boolean;
}

export interface ScanHistoryItem {
  id: string;
  product: Product;
  verdict: Verdict;
  scannedAt: number;
}

export type Rule = (p: Product, prefs: UserPreferences) => Flag[];

export const ALLERGEN_KEYS: readonly AllergenKey[] = [
  'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk', 'nuts',
  'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
];

export const DEFAULT_PREFS: UserPreferences = {
  allergens: [], additiveAlerts: [], novaAlert: null, diet: 'none', avoidPalmOil: false,
};
