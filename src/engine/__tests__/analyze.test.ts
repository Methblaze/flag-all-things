import { DEFAULT_PREFS } from '@/domain/types';
import { makeProduct } from '@/engine/__fixtures__/make';
import { analyze } from '@/engine/analyze';

test('no ingredients and no nutrition → unknown', () => expect(analyze(makeProduct({ name: 'X' }), DEFAULT_PREFS)).toMatchObject({ verdict: 'unknown', headline: 'Not enough data to judge' }));
test('personal allergen → avoid, headline from top flag', () => expect(analyze(makeProduct({ ingredientsText: 'Mælk', allergens: ['milk'], allergenDataKnown: true, nova: 4 }), { ...DEFAULT_PREFS, allergens: ['milk'] })).toMatchObject({ verdict: 'avoid', headline: 'Contains milk (on your alert list)' }));
test('warnings only → caution', () => expect(analyze(makeProduct({ ingredientsText: 'x', nova: 4 }), DEFAULT_PREFS).verdict).toBe('caution'));
test('good signals, no warnings → good', () => expect(analyze(makeProduct({ ingredientsText: 'Rugmel', nova: 1, nutriscore: 'a' }), DEFAULT_PREFS).verdict).toBe('good'));
test('info only → ok', () => expect(analyze(makeProduct({ ingredientsText: 'x', nova: 3 }), DEFAULT_PREFS).verdict).toBe('ok'));
test('flags sorted danger, warning, info, good, and counts match', () => {
  const r = analyze(makeProduct({ ingredientsText: 'Mælk, E330', allergenDataKnown: true, nova: 4, nutriscore: 'a' }), { ...DEFAULT_PREFS, allergens: ['milk'] });
  expect(r.flags.map(f => f.severity)).toEqual(['danger', 'warning', 'info', 'good']);
  expect(r.counts).toEqual({ danger: 1, warning: 1, info: 1, good: 1 });
});
test('missing sections listed', () => expect(analyze(makeProduct({ ingredientsText: 'x' }), DEFAULT_PREFS).missing).toEqual(expect.arrayContaining(['processing', 'nutrition'])));
test('all-unknown product misses every section', () => expect(analyze(makeProduct(), DEFAULT_PREFS).missing.sort()).toEqual(['additives', 'allergens', 'diet', 'nutrition', 'processing']));
test('no flags → "No concerns found"', () => expect(analyze(makeProduct({ ingredientsText: 'vand' }), DEFAULT_PREFS)).toMatchObject({ verdict: 'ok', headline: 'No concerns found' }));
test('deterministic', () => { const p = makeProduct({ ingredientsText: 'Sukker, E250', nova: 4 }); expect(analyze(p, DEFAULT_PREFS)).toEqual(analyze(p, DEFAULT_PREFS)); });
test('good verdict headline comes from a good flag, not an info note', () =>
  expect(analyze(makeProduct({ ingredientsText: 'Rugmel', nova: 1, nutriscore: 'a' }), DEFAULT_PREFS).headline).toBe('Nutri-Score A'));
