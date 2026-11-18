import { DEFAULT_PREFS, type Product } from '@/domain/types';
import { makeProduct } from '@/engine/__fixtures__/make';
import { nutritionRule } from '@/engine/rules/nutrition';

const n = (o: Partial<Product['nutrition']>) => ({ energyKcal: null, sugars: null, saturatedFat: null, salt: null, fiber: null, protein: null, ...o });
test('salt 1.6 g food → high', () => expect(nutritionRule(makeProduct({ nutrition: n({ salt: 1.6 }) }), DEFAULT_PREFS)).toEqual([expect.objectContaining({ id: 'nutrition:salt-high', severity: 'warning', detail: '1.6 g per 100 g, above the 1.5 g "high" level.' })]));
test('salt exactly 1.5 → not high', () => expect(nutritionRule(makeProduct({ nutrition: n({ salt: 1.5 }) }), DEFAULT_PREFS)).toEqual([]));
test('drink sugars 11.3 → high, 11.2 → not', () => {
  expect(nutritionRule(makeProduct({ isBeverage: true, nutrition: n({ sugars: 11.3 }) }), DEFAULT_PREFS)[0].id).toBe('nutrition:sugars-high');
  expect(nutritionRule(makeProduct({ isBeverage: true, nutrition: n({ sugars: 11.2 }) }), DEFAULT_PREFS)).toEqual([]);
});
test('drink detail says per 100 ml', () => expect(nutritionRule(makeProduct({ isBeverage: true, nutrition: n({ salt: 0.8 }) }), DEFAULT_PREFS)[0].detail).toContain('per 100 ml'));
test('food thresholds', () => {
  const ids = nutritionRule(makeProduct({ nutrition: n({ sugars: 22.6, saturatedFat: 5.1 }) }), DEFAULT_PREFS).map(f => f.id);
  expect(ids).toEqual(expect.arrayContaining(['nutrition:sugars-high', 'nutrition:saturated-fat-high']));
});
test('Nutri-Score', () => {
  expect(nutritionRule(makeProduct({ nutriscore: 'e' }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'nutrition:nutriscore-e', severity: 'warning' });
  expect(nutritionRule(makeProduct({ nutriscore: 'a' }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'nutrition:nutriscore-a', severity: 'good' });
});
test('fibre below 3 g → info', () => expect(nutritionRule(makeProduct({ nutrition: n({ fiber: 2.9 }) }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'nutrition:fiber-low', severity: 'info' }));
test('sugar as main ingredient', () => expect(nutritionRule(makeProduct({ ingredientsText: 'Sukker, kakao' }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'nutrition:sugar-main', severity: 'warning' }));
test('threshold flags carry the FSA source', () => expect(nutritionRule(makeProduct({ nutrition: n({ salt: 2 }) }), DEFAULT_PREFS)[0].source?.url).toMatch(/^https:\/\/www\.food\.gov\.uk/));
test('every nutrition flag has a source', () => {
  const flags = nutritionRule(makeProduct({ ingredientsText: 'Sukker, salt', nutriscore: 'd', nutrition: n({ salt: 2, fiber: 1 }) }), DEFAULT_PREFS);
  expect(flags.length).toBe(4);
  for (const f of flags) expect(f.source?.url).toMatch(/^https:/);
});
