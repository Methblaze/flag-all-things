import type { Flag, Rule } from '@/domain/types';
import { mentionsPalmOil } from '@/engine/parse';

const flag = (id: string, severity: Flag['severity'], title: string, detail: string, personal = false): Flag =>
  ({ id: `diet:${id}`, category: 'diet', severity, title, detail, personal });

export const dietRule: Rule = (p, prefs) => {
  const flags: Flag[] = [];
  if (prefs.diet !== 'none') {
    const want = prefs.diet; // 'vegan' | 'vegetarian'
    const status = p.diet[want];
    if (status === false) flags.push(flag(`not-${want}`, 'danger', `Not ${want} (on your alert list)`, `The ingredients include animal products that are not ${want}.`, true));
    else if (status === null) flags.push(flag(`${want}-unknown`, 'warning', `${want === 'vegan' ? 'Vegan' : 'Vegetarian'} status unknown`, 'Check the ingredient list on the pack.', true));
    else flags.push(flag(want, 'good', want === 'vegan' ? 'Vegan' : 'Vegetarian', 'Matches your diet.'));
  }
  const palm = p.diet.palmOil ?? (p.ingredientsText ? mentionsPalmOil(p.ingredientsText) : null);
  if (palm) {
    flags.push(prefs.avoidPalmOil
      ? flag('palm-oil', 'danger', 'Contains palm oil (on your alert list)', 'Palm oil is listed in the ingredients.', true)
      : flag('palm-oil', 'info', 'Contains palm oil', 'Palm oil is listed in the ingredients.'));
  }
  if (p.ecoscore) {
    const sev = p.ecoscore === 'a' || p.ecoscore === 'b' ? 'good' : p.ecoscore === 'c' ? null : 'info';
    if (sev) flags.push(flag(`ecoscore-${p.ecoscore}`, sev, `Eco-Score ${p.ecoscore.toUpperCase()}`, 'Environmental impact, from A (lowest) to E.'));
  }
  return flags;
};
