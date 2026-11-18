import type { AllergenKey, Flag, Rule } from '@/domain/types';
import { ALLERGEN_LABELS } from '@/engine/data/allergens';
import { findAllergens } from '@/engine/parse';

const flag = (id: string, severity: Flag['severity'], title: string, detail: string, personal: boolean): Flag =>
  ({ id: `allergen:${id}`, category: 'allergens', severity, title, detail, personal });

export const allergensRule: Rule = (p, prefs) => {
  const parsed = p.ingredientsText ? findAllergens(p.ingredientsText) : { contains: [], traces: [] };
  const contains = [...new Set<AllergenKey>([...p.allergens, ...parsed.contains])];
  const traces = [...new Set<AllergenKey>([...p.traces, ...parsed.traces])].filter(k => !contains.includes(k));
  const mine = (k: AllergenKey) => prefs.allergens.includes(k);
  const flags: Flag[] = [
    ...contains.map(k => mine(k)
      ? flag(k, 'danger', `Contains ${ALLERGEN_LABELS[k]} — on your alert list`, 'Listed in the ingredients.', true)
      : flag(k, 'info', `Contains ${ALLERGEN_LABELS[k]}`, 'Listed in the ingredients.', false)),
    ...traces.map(k => flag(`${k}-traces`, mine(k) ? 'warning' : 'info', `May contain traces of ${ALLERGEN_LABELS[k]}`,
      'The pack warns of possible cross-contamination.', mine(k))),
  ];
  // Missing data is never "no allergens" (design doc anti-goal).
  if (!p.allergenDataKnown && prefs.allergens.length > 0) {
    flags.push(flag('unknown', 'warning', 'Allergen info missing — check the pack', 'This product has no ingredient or allergen data on record.', true));
  }
  return flags;
};
