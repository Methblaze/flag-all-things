import { DEFAULT_PREFS } from '@/domain/types';
import { makeProduct } from '@/engine/__fixtures__/make';
import { additivesRule } from '@/engine/rules/additives';

test('high-concern → warning with source', () => expect(additivesRule(makeProduct({ additives: ['e250'] }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'additive:e250', severity: 'warning', source: expect.objectContaining({ url: expect.stringMatching(/^https:/) }) }));
test('low-concern → info', () => expect(additivesRule(makeProduct({ additives: ['e330'] }), DEFAULT_PREFS)[0].severity).toBe('info'));
test('unknown code → info "no notes"', () => expect(additivesRule(makeProduct({ additives: ['e999'] }), DEFAULT_PREFS)[0]).toMatchObject({ severity: 'info', detail: expect.stringContaining('No notes') }));
test('user alert → danger', () => expect(additivesRule(makeProduct({ additives: ['e330'] }), { ...DEFAULT_PREFS, additiveAlerts: ['e330'] })[0]).toMatchObject({ severity: 'danger', personal: true }));
test('text merge, no duplicates', () => expect(additivesRule(makeProduct({ additives: ['e250'], ingredientsText: 'salt, E250, E330' }), DEFAULT_PREFS).map(f => f.id)).toEqual(['additive:e250', 'additive:e330']));
test('OFF sub-variant resolves to its base entry', () => expect(additivesRule(makeProduct({ additives: ['e322i'] }), DEFAULT_PREFS)[0].title).toBe('E322i Lecithins'));
test('detail text has no middle-dot join (Hallmark floor)', () => expect(additivesRule(makeProduct({ additives: ['e250'] }), DEFAULT_PREFS)[0].detail).not.toContain('·'));
