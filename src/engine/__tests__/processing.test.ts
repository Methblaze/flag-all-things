import { DEFAULT_PREFS } from '@/domain/types';
import { makeProduct } from '@/engine/__fixtures__/make';
import { processingRule } from '@/engine/rules/processing';

test('NOVA 4 default → warning', () => expect(processingRule(makeProduct({ nova: 4 }), DEFAULT_PREFS)).toEqual([expect.objectContaining({ id: 'processing:nova-4', severity: 'warning', personal: false })]));
test('NOVA 4 with novaAlert 4 → danger', () => expect(processingRule(makeProduct({ nova: 4 }), { ...DEFAULT_PREFS, novaAlert: 4 })[0]).toMatchObject({ severity: 'danger', personal: true }));
test('NOVA 3 with novaAlert 3 → danger', () => expect(processingRule(makeProduct({ nova: 3 }), { ...DEFAULT_PREFS, novaAlert: 3 })[0].severity).toBe('danger'));
test('NOVA 3 default → info', () => expect(processingRule(makeProduct({ nova: 3 }), DEFAULT_PREFS)[0].severity).toBe('info'));
test('NOVA 1 → good', () => expect(processingRule(makeProduct({ nova: 1 }), DEFAULT_PREFS)[0].severity).toBe('good'));
test('NOVA null → none', () => expect(processingRule(makeProduct(), DEFAULT_PREFS)).toEqual([]));
