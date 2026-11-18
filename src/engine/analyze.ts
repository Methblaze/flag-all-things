import type { FlagCategory, FlagReport, Product, Rule, Severity, UserPreferences, Verdict } from '@/domain/types';
import { additivesRule } from '@/engine/rules/additives';
import { allergensRule } from '@/engine/rules/allergens';
import { dietRule } from '@/engine/rules/diet';
import { nutritionRule } from '@/engine/rules/nutrition';
import { processingRule } from '@/engine/rules/processing';

const RULES: Rule[] = [allergensRule, dietRule, additivesRule, nutritionRule, processingRule];
const SEVERITY_ORDER: Severity[] = ['danger', 'warning', 'info', 'good'];
// Result-screen section order (interaction spec F5): most personal first.
export const CATEGORY_ORDER: FlagCategory[] = ['allergens', 'diet', 'additives', 'nutrition', 'processing'];

function missingSections(p: Product): FlagCategory[] {
  const noNutrition = Object.values(p.nutrition).every(v => v === null) && p.nutriscore === null;
  const checks: [FlagCategory, boolean][] = [
    ['allergens', !p.allergenDataKnown],
    ['diet', Object.values(p.diet).every(v => v === null) && p.ecoscore === null && !p.ingredientsText],
    ['additives', !p.ingredientsText && p.additives.length === 0],
    ['nutrition', noNutrition],
    ['processing', p.nova === null],
  ];
  return checks.filter(([, missing]) => missing).map(([c]) => c);
}

export function analyze(product: Product, prefs: UserPreferences): FlagReport {
  const flags = RULES.flatMap(rule => rule(product, prefs)).sort((a, b) =>
    SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  const counts = { danger: 0, warning: 0, info: 0, good: 0 };
  for (const f of flags) counts[f.severity]++;
  const missing = missingSections(product);

  const noData = !product.ingredientsText && missing.includes('nutrition');
  // A conflict with the user's own settings wins even when the record is thin.
  const verdict: Verdict = counts.danger ? 'avoid'
    : noData ? 'unknown'
    : counts.warning ? 'caution'
    : counts.good ? 'good'
    : 'ok';
  // Headline comes from the severity that decided the verdict (a Good product leads with a good flag).
  const lead: Severity = verdict === 'avoid' ? 'danger' : verdict === 'caution' ? 'warning' : verdict === 'good' ? 'good' : 'info';
  const headline = verdict === 'unknown' ? 'Not enough data to judge'
    : flags.find(f => f.severity === lead)?.title ?? 'No concerns found';
  return { verdict, headline, counts, flags, missing };
}
