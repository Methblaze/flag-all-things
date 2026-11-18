import type { AllergenKey } from '@/domain/types';

export const ALLERGEN_LABELS: Record<AllergenKey, string> = {
  gluten: 'gluten', crustaceans: 'crustaceans', eggs: 'egg', fish: 'fish', peanuts: 'peanuts',
  soy: 'soy', milk: 'milk', nuts: 'tree nuts', celery: 'celery', mustard: 'mustard',
  sesame: 'sesame', sulphites: 'sulphites', lupin: 'lupin', molluscs: 'molluscs',
};

// Lowercase, Danish + English. Words of ≤3 letters match only at a word start; longer ones anywhere,
// so Danish compounds (sødmælk, hasselnødder) still hit.
export const ALLERGEN_WORDS: Record<AllergenKey, string[]> = {
  gluten: ['hvede', 'rug', 'byg', 'havre', 'spelt', 'kamut', 'emmer', 'enkorn', 'durum', 'gluten', 'wheat', 'rye', 'barley', 'oat', 'semolina'],
  crustaceans: ['reje', 'krebs', 'krabbe', 'hummer', 'languster', 'crustacean', 'shrimp', 'prawn', 'crab', 'lobster'],
  eggs: ['æg', 'hønseæg', 'egg'],
  fish: ['fisk', 'torsk', 'laks', 'sild', 'makrel', 'tun', 'ansjos', 'fish', 'salmon', 'cod', 'tuna', 'anchov'],
  peanuts: ['jordnød', 'peanut'],
  soy: ['soja', 'soy'],
  milk: ['mælk', 'fløde', 'valle', 'smør', 'ost', 'laktose', 'kasein', 'yoghurt', 'skyr', 'milk', 'cream', 'butter', 'whey', 'cheese', 'lactose', 'casein'],
  nuts: ['mandel', 'hasselnød', 'valnød', 'nødder', 'cashew', 'pekan', 'paranød', 'pistacie', 'macadamia', 'almond', 'hazelnut', 'walnut', 'pecan', 'brazil nut', 'pistachio', 'nut'],
  celery: ['selleri', 'celery', 'celeriac'],
  mustard: ['sennep', 'mustard'],
  sesame: ['sesam', 'tahin', 'sesame'],
  sulphites: ['sulfit', 'svovldioxid', 'sulphite', 'sulfite', 'sulphur dioxide'],
  lupin: ['lupin'],
  molluscs: ['blæksprutte', 'musling', 'østers', 'snegl', 'mollus', 'squid', 'octopus', 'mussel', 'oyster', 'clam', 'scallop'],
};

// Terms that contain an allergen word but are not that allergen; blanked out before matching.
export const ALLERGEN_FALSE_FRIENDS: Partial<Record<AllergenKey, string[]>> = {
  gluten: ['boghvede', 'buckwheat'],
  eggs: ['ægte'],
  milk: ['mælkesyre', 'kokosmælk', 'kokosfløde', 'mandelmælk', 'havremælk', 'sojamælk', 'rismælk', 'kakaosmør',
    'sheasmør', 'jordnøddesmør', 'coconut milk', 'cocoa butter', 'shea butter', 'peanut butter', 'nut butter'],
  nuts: ['jordnød', 'muskatnød', 'kokosnød', 'nutmeg', 'peanut'],
};

export const SUGAR_WORDS = ['sukker', 'rørsukker', 'glukosesirup', 'glukose-fruktosesirup', 'fruktosesirup', 'dextrose',
  'druesukker', 'invertsukker', 'honning', 'sugar', 'glucose syrup'];
