import type { Product } from '@/domain/types';

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    barcode: '5701234567899', name: null, brand: null, imageUrl: null, ingredientsText: null,
    additives: [], allergens: [], traces: [], allergenDataKnown: false,
    nova: null, nutriscore: null, ecoscore: null, isBeverage: false,
    nutrition: { energyKcal: null, sugars: null, saturatedFat: null, salt: null, fiber: null, protein: null },
    diet: { vegan: null, vegetarian: null, palmOil: null },
    source: 'off', fetchedAt: 0,
    ...overrides,
  };
}
