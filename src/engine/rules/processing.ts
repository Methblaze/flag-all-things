import type { Flag, Rule } from '@/domain/types';

const NOVA_SOURCE = { label: 'Open Food Facts, NOVA classification', url: 'https://world.openfoodfacts.org/nova' };
const TITLES = { 1: 'Minimally processed (NOVA 1)', 2: 'Processed culinary ingredient (NOVA 2)', 3: 'Processed (NOVA 3)', 4: 'Ultra-processed (NOVA 4)' } as const;
const DETAILS = {
  1: 'Unprocessed or minimally processed food.',
  2: 'An ingredient like oil, butter, sugar or salt.',
  3: 'Made by adding salt, sugar or oil to whole foods.',
  4: 'Industrial formulation, typically with additives and ingredients not used in home cooking.',
} as const;

export const processingRule: Rule = (p, prefs) => {
  if (p.nova === null) return [];
  const personal = prefs.novaAlert !== null && p.nova >= prefs.novaAlert;
  const severity: Flag['severity'] = personal ? 'danger' : p.nova === 4 ? 'warning' : p.nova === 3 ? 'info' : 'good';
  return [{ id: `processing:nova-${p.nova}`, category: 'processing', severity, title: TITLES[p.nova], detail: DETAILS[p.nova], source: NOVA_SOURCE, personal }];
};
