import { DEFAULT_PREFS, type AllergenKey } from '@/domain/types';
import { makeProduct } from '@/engine/__fixtures__/make';
import { allergensRule } from '@/engine/rules/allergens';

const milkPref = { ...DEFAULT_PREFS, allergens: ['milk'] as AllergenKey[] };
test('my allergen present → danger', () => expect(allergensRule(makeProduct({ allergens: ['milk'], allergenDataKnown: true }), milkPref)[0]).toMatchObject({ id: 'allergen:milk', severity: 'danger', title: 'Contains milk — on your alert list' }));
test('my allergen as traces → warning', () => expect(allergensRule(makeProduct({ traces: ['milk'], allergenDataKnown: true }), milkPref)[0]).toMatchObject({ id: 'allergen:milk-traces', severity: 'warning' }));
test('other allergen → info', () => expect(allergensRule(makeProduct({ allergens: ['gluten'], allergenDataKnown: true }), milkPref)[0].severity).toBe('info'));
test('unknown data + my list → warning', () => expect(allergensRule(makeProduct({ allergenDataKnown: false }), milkPref)).toEqual([expect.objectContaining({ id: 'allergen:unknown', severity: 'warning' })]));
test('text-parsed allergens count', () => expect(allergensRule(makeProduct({ ingredientsText: 'Sødmælk, salt', allergenDataKnown: true }), milkPref)[0].id).toBe('allergen:milk'));
test('contains outranks traces for the same allergen', () => expect(allergensRule(makeProduct({ allergens: ['milk'], traces: ['milk'], allergenDataKnown: true }), milkPref).map(f => f.id)).toEqual(['allergen:milk']));
