import type { Flag, Nutrition, Rule } from '@/domain/types';
import { sugarIsMainIngredient } from '@/engine/parse';

export const FSA_SOURCE = { label: 'UK FSA front-of-pack criteria', url: 'https://www.food.gov.uk/business-guidance/packaging-and-labelling' };
const NUTRISCORE_SOURCE = { label: 'Open Food Facts, Nutri-Score', url: 'https://world.openfoodfacts.org/nutriscore' };
const ORDER_SOURCE = { label: 'EU Regulation 1169/2011 (ingredients listed by weight)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R1169' };
const FIBRE_SOURCE = { label: 'EU Regulation 1924/2006 (nutrition claims)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32006R1924' };

// "High" levels per 100 g (food) / 100 ml (drinks), strictly greater-than.
const HIGH: { key: keyof Nutrition; id: string; title: string; food: number; drink: number }[] = [
  { key: 'sugars', id: 'sugars-high', title: 'High in sugars', food: 22.5, drink: 11.25 },
  { key: 'saturatedFat', id: 'saturated-fat-high', title: 'High in saturated fat', food: 5, drink: 2.5 },
  { key: 'salt', id: 'salt-high', title: 'High in salt', food: 1.5, drink: 0.75 },
];
const FIBRE_SOURCE_LEVEL = 3;
const fmt = (n: number) => String(Math.round(n * 100) / 100);
const flag = (id: string, severity: Flag['severity'], title: string, detail: string, source: Flag['source']): Flag =>
  ({ id: `nutrition:${id}`, category: 'nutrition', severity, title, detail, source, personal: false });

export const nutritionRule: Rule = (p) => {
  const flags: Flag[] = [];
  const unit = p.isBeverage ? '100 ml' : '100 g';
  for (const h of HIGH) {
    const v = p.nutrition[h.key];
    const limit = p.isBeverage ? h.drink : h.food;
    if (v !== null && v > limit) flags.push(flag(h.id, 'warning', h.title, `${fmt(v)} g per ${unit} — above the ${fmt(limit)} g "high" level.`, FSA_SOURCE));
  }
  if (p.ingredientsText && sugarIsMainIngredient(p.ingredientsText)) {
    flags.push(flag('sugar-main', 'warning', 'Sugar is a main ingredient', 'Sugar is listed among the first two ingredients, which are ordered by weight.', ORDER_SOURCE));
  }
  if (p.nutriscore) {
    const sev = p.nutriscore === 'a' || p.nutriscore === 'b' ? 'good' : p.nutriscore === 'c' ? 'info' : 'warning';
    flags.push(flag(`nutriscore-${p.nutriscore}`, sev, `Nutri-Score ${p.nutriscore.toUpperCase()}`, 'Overall nutritional quality, from A (best) to E.', NUTRISCORE_SOURCE));
  }
  // Fibre is meaningless for drinks; only flag food.
  const fiber = p.nutrition.fiber;
  if (!p.isBeverage && fiber !== null && fiber < FIBRE_SOURCE_LEVEL) {
    flags.push(flag('fiber-low', 'info', 'Low in fibre', `${fmt(fiber)} g per 100 g — below the 3 g "source of fibre" level.`, FIBRE_SOURCE));
  }
  return flags;
};
