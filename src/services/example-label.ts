import type { Product } from '@/domain/types';

// Shown when no API key is set, so portfolio visitors still see the full label flow. Never saved to History.
export const EXAMPLE_LABEL_PRODUCT: Product = {
  barcode: null,
  name: 'Leverpostej (example)',
  brand: null,
  imageUrl: null,
  ingredientsText: 'Svinelever 30%, svinespæk, vand, hvedemel, skummetmælkspulver, løg, salt, krydderier, konserveringsmiddel (E250), antioxidant (E301).',
  additives: [],
  allergens: [],
  traces: [],
  allergenDataKnown: true,
  nova: null,
  nutriscore: null,
  ecoscore: null,
  isBeverage: false,
  nutrition: { energyKcal: 245, sugars: 1.5, saturatedFat: 7.2, salt: 1.7, fiber: 0.6, protein: 10 },
  diet: { vegan: null, vegetarian: null, palmOil: null },
  source: 'example',
  fetchedAt: 0,
};
