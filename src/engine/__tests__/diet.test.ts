import { DEFAULT_PREFS } from '@/domain/types';
import { makeProduct } from '@/engine/__fixtures__/make';
import { dietRule } from '@/engine/rules/diet';

test('vegan diet, not vegan → danger', () => expect(dietRule(makeProduct({ diet: { vegan: false, vegetarian: true, palmOil: null } }), { ...DEFAULT_PREFS, diet: 'vegan' })[0]).toMatchObject({ id: 'diet:not-vegan', severity: 'danger' }));
test('vegan diet, unknown → warning', () => expect(dietRule(makeProduct(), { ...DEFAULT_PREFS, diet: 'vegan' })[0]).toMatchObject({ id: 'diet:vegan-unknown', severity: 'warning' }));
test('vegetarian diet, not vegetarian → danger', () => expect(dietRule(makeProduct({ diet: { vegan: false, vegetarian: false, palmOil: null } }), { ...DEFAULT_PREFS, diet: 'vegetarian' })[0]).toMatchObject({ id: 'diet:not-vegetarian', severity: 'danger' }));
test('palm oil from text when tags are null', () => expect(dietRule(makeProduct({ ingredientsText: 'palmeolie, sukker' }), { ...DEFAULT_PREFS, avoidPalmOil: true })[0]).toMatchObject({ id: 'diet:palm-oil', severity: 'danger' }));
test('palm oil without preference → info', () => expect(dietRule(makeProduct({ diet: { vegan: null, vegetarian: null, palmOil: true } }), DEFAULT_PREFS)[0].severity).toBe('info'));
test('Eco-Score', () => {
  expect(dietRule(makeProduct({ ecoscore: 'a' }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'diet:ecoscore-a', severity: 'good' });
  expect(dietRule(makeProduct({ ecoscore: 'e' }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'diet:ecoscore-e', severity: 'info' });
});
