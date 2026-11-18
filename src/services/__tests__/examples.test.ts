import { DEFAULT_PREFS } from '@/domain/types';
import { analyze } from '@/engine/analyze';
import { normalizeOff } from '@/services/off';

// The portfolio examples must show different verdicts (design doc §11).
const report = (code: string, prefs = DEFAULT_PREFS) => analyze(normalizeOff(require(`../__fixtures__/off/${code}.json`), 0)!, prefs);

test('Sol Gryn oats → good', () => expect(report('5701164710389').verdict).toBe('good'));
test('Faxe Kondi → caution', () => expect(report('5741000109151').verdict).toBe('caution'));
test('Stryhns leverpostej → caution', () => expect(report('5704000502391').verdict).toBe('caution'));
test('Arla sødmælk with a milk alert → avoid', () => expect(report('5700426101019', { ...DEFAULT_PREFS, allergens: ['milk'] })).toMatchObject({ verdict: 'avoid', headline: 'Contains milk (on your alert list)' }));
