// Curated E-number table. Baseline policy (owner, 2026-11-19): `concern: 'high'` only where EU/DK law or EFSA
// restricts, bans or requires a warning. Other classifications (e.g. IARC) stay in `why` as a neutral note;
// users add stricter personal alerts in Settings.
export type AdditiveGroup =
  | 'colour' | 'preservative' | 'antioxidant' | 'sweetener' | 'emulsifier' | 'thickener'
  | 'flavour-enhancer' | 'acid' | 'other';

export interface AdditiveInfo {
  code: string;
  en: string;
  da: string;
  group: AdditiveGroup;
  concern: 'high' | 'low';
  why: string;
  source: { label: string; url: string };
  match: string[]; // lowercase name terms found in ingredient text
}

const EU = { label: 'EU Regulation 1333/2008 (authorised additives)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008R1333' };
const ANNEX_V = { label: 'EU Regulation 1333/2008, Annex V', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008R1333' };
const E171_BAN = { label: 'EU Regulation 2022/63 (E171 ban)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R0063' };
const NITROSAMINES = { label: 'EFSA, Nitrosamines in food (2023)', url: 'https://www.efsa.europa.eu/en/news/nitrosamines-food-raise-health-concern' };
const ASPARTAME = { label: 'WHO/IARC/JECFA, Aspartame assessment (2023)', url: 'https://www.who.int/news/item/14-07-2023-aspartame-hazard-and-risk-assessment-results-released' };
const IARC = { label: 'IARC classifications (Group 2B)', url: 'https://monographs.iarc.who.int/list-of-classifications' };

const SOUTHAMPTON = 'EU law requires the label "may have an adverse effect on activity and attention in children".';
const NITRITE = 'Can form nitrosamines in cured meat; EFSA (2023) found exposure raises a health concern.';

type Row = [code: string, en: string, da: string, group: AdditiveGroup, why?: string, high?: 'high', source?: AdditiveInfo['source'], match?: string[]];

const ROWS: Row[] = [
  ['e100', 'Curcumin', 'Kurkumin', 'colour'],
  ['e101', 'Riboflavin', 'Riboflavin', 'colour'],
  ['e102', 'Tartrazine', 'Tartrazin', 'colour', SOUTHAMPTON, 'high', ANNEX_V],
  ['e104', 'Quinoline yellow', 'Quinolingult', 'colour', SOUTHAMPTON, 'high', ANNEX_V],
  ['e110', 'Sunset yellow FCF', 'Sunset yellow FCF', 'colour', SOUTHAMPTON, 'high', ANNEX_V],
  ['e120', 'Carmine', 'Karmin', 'colour', 'Made from insects; not vegetarian.'],
  ['e122', 'Azorubine', 'Azorubin', 'colour', SOUTHAMPTON, 'high', ANNEX_V],
  ['e124', 'Ponceau 4R', 'Ponceau 4R', 'colour', SOUTHAMPTON, 'high', ANNEX_V],
  ['e129', 'Allura red AC', 'Allura rød AC', 'colour', SOUTHAMPTON, 'high', ANNEX_V],
  ['e133', 'Brilliant blue FCF', 'Brillantblåt FCF', 'colour'],
  ['e140', 'Chlorophylls', 'Klorofyl', 'colour'],
  ['e141', 'Copper chlorophylls', 'Kobberklorofyl', 'colour'],
  ['e150a', 'Plain caramel', 'Karamel', 'colour', undefined, undefined, undefined, []],
  ['e150c', 'Ammonia caramel', 'Ammoniakkaramel', 'colour'],
  ['e150d', 'Sulphite ammonia caramel', 'Ammoniumsulfitkaramel', 'colour'],
  ['e153', 'Vegetable carbon', 'Vegetabilsk kul', 'colour'],
  ['e160a', 'Carotenes', 'Carotener', 'colour'],
  ['e160b', 'Annatto', 'Annatto', 'colour'],
  ['e160c', 'Paprika extract', 'Paprikaekstrakt', 'colour'],
  ['e162', 'Beetroot red', 'Rødbedefarve', 'colour'],
  ['e163', 'Anthocyanins', 'Antocyaner', 'colour'],
  ['e170', 'Calcium carbonate', 'Calciumcarbonat', 'colour'],
  ['e171', 'Titanium dioxide', 'Titandioxid', 'colour', 'Banned as a food additive in the EU since 2022 over genotoxicity concerns.', 'high', E171_BAN],
  ['e200', 'Sorbic acid', 'Sorbinsyre', 'preservative'],
  ['e202', 'Potassium sorbate', 'Kaliumsorbat', 'preservative'],
  ['e210', 'Benzoic acid', 'Benzoesyre', 'preservative'],
  ['e211', 'Sodium benzoate', 'Natriumbenzoat', 'preservative'],
  ['e220', 'Sulphur dioxide', 'Svovldioxid', 'preservative', 'A sulphite: a listed allergen for sensitive people.'],
  ['e223', 'Sodium metabisulphite', 'Natriummetabisulfit', 'preservative', 'A sulphite: a listed allergen for sensitive people.'],
  ['e224', 'Potassium metabisulphite', 'Kaliummetabisulfit', 'preservative', 'A sulphite: a listed allergen for sensitive people.'],
  ['e249', 'Potassium nitrite', 'Kaliumnitrit', 'preservative', NITRITE, 'high', NITROSAMINES],
  ['e250', 'Sodium nitrite', 'Natriumnitrit', 'preservative', NITRITE, 'high', NITROSAMINES],
  ['e251', 'Sodium nitrate', 'Natriumnitrat', 'preservative', NITRITE, 'high', NITROSAMINES],
  ['e252', 'Potassium nitrate', 'Kaliumnitrat', 'preservative', NITRITE, 'high', NITROSAMINES],
  ['e260', 'Acetic acid', 'Eddikesyre', 'acid'],
  ['e262', 'Sodium acetates', 'Natriumacetat', 'preservative'],
  ['e270', 'Lactic acid', 'Mælkesyre', 'acid', 'Not dairy, despite the Danish name.'],
  ['e280', 'Propionic acid', 'Propionsyre', 'preservative'],
  ['e282', 'Calcium propionate', 'Calciumpropionat', 'preservative'],
  ['e290', 'Carbon dioxide', 'Kuldioxid', 'other'],
  ['e296', 'Malic acid', 'Æblesyre', 'acid'],
  ['e300', 'Ascorbic acid', 'Ascorbinsyre', 'antioxidant', 'Vitamin C.'],
  ['e301', 'Sodium ascorbate', 'Natriumascorbat', 'antioxidant'],
  ['e306', 'Tocopherols', 'Tocopherol', 'antioxidant', 'Vitamin E.'],
  ['e307', 'Alpha-tocopherol', 'Alfa-tocopherol', 'antioxidant', 'Vitamin E.'],
  ['e320', 'Butylated hydroxyanisole (BHA)', 'Butylhydroxyanisol', 'antioxidant', 'Permitted in the EU. IARC lists it as possibly carcinogenic to humans (Group 2B).', undefined, IARC],
  ['e321', 'Butylated hydroxytoluene (BHT)', 'Butylhydroxytoluen', 'antioxidant'],
  ['e322', 'Lecithins', 'Lecithin', 'emulsifier', 'Often from soy or sunflower.'],
  ['e325', 'Sodium lactate', 'Natriumlactat', 'acid'],
  ['e330', 'Citric acid', 'Citronsyre', 'acid'],
  ['e331', 'Sodium citrates', 'Natriumcitrat', 'acid'],
  ['e332', 'Potassium citrates', 'Kaliumcitrat', 'acid'],
  ['e334', 'Tartaric acid', 'Vinsyre', 'acid'],
  ['e338', 'Phosphoric acid', 'Fosforsyre', 'acid'],
  ['e339', 'Sodium phosphates', 'Natriumfosfat', 'other'],
  ['e340', 'Potassium phosphates', 'Kaliumfosfat', 'other'],
  ['e341', 'Calcium phosphates', 'Calciumfosfat', 'other'],
  ['e392', 'Rosemary extract', 'Rosmarinekstrakt', 'antioxidant'],
  ['e400', 'Alginic acid', 'Alginsyre', 'thickener'],
  ['e401', 'Sodium alginate', 'Natriumalginat', 'thickener'],
  ['e406', 'Agar', 'Agar', 'thickener'],
  ['e407', 'Carrageenan', 'Carrageenan', 'thickener'],
  ['e410', 'Locust bean gum', 'Johannesbrødkernemel', 'thickener'],
  ['e412', 'Guar gum', 'Guargummi', 'thickener'],
  ['e414', 'Gum arabic', 'Gummi arabicum', 'thickener'],
  ['e415', 'Xanthan gum', 'Xanthangummi', 'thickener'],
  ['e418', 'Gellan gum', 'Gellangummi', 'thickener'],
  ['e420', 'Sorbitol', 'Sorbitol', 'sweetener', 'Large amounts can have a laxative effect.'],
  ['e422', 'Glycerol', 'Glycerol', 'other'],
  ['e440', 'Pectins', 'Pektin', 'thickener'],
  ['e450', 'Diphosphates', 'Difosfat', 'other'],
  ['e451', 'Triphosphates', 'Trifosfat', 'other'],
  ['e452', 'Polyphosphates', 'Polyfosfat', 'other'],
  ['e460', 'Cellulose', 'Cellulose', 'thickener'],
  ['e461', 'Methyl cellulose', 'Methylcellulose', 'thickener'],
  ['e464', 'Hydroxypropyl methyl cellulose', 'Hydroxypropylmethylcellulose', 'thickener'],
  ['e466', 'Carboxymethyl cellulose', 'Carboxymethylcellulose', 'thickener'],
  ['e471', 'Mono- and diglycerides of fatty acids', 'Mono- og diglycerider af fedtsyrer', 'emulsifier'],
  ['e472e', 'DATEM', 'Mono- og diacetylvinsyreestere af mono- og diglycerider af fedtsyrer', 'emulsifier'],
  ['e476', 'Polyglycerol polyricinoleate (PGPR)', 'Polyglycerolpolyricinoleat', 'emulsifier'],
  ['e481', 'Sodium stearoyl-2-lactylate', 'Natriumstearoyl-2-lactylat', 'emulsifier'],
  ['e500', 'Sodium carbonates', 'Natriumcarbonat', 'other', 'Baking soda.'],
  ['e501', 'Potassium carbonates', 'Kaliumcarbonat', 'other'],
  ['e503', 'Ammonium carbonates', 'Ammoniumcarbonat', 'other', 'Hornsalt, a raising agent.'],
  ['e509', 'Calcium chloride', 'Calciumchlorid', 'other'],
  ['e551', 'Silicon dioxide', 'Siliciumdioxid', 'other'],
  ['e575', 'Glucono-delta-lactone', 'Glucono-delta-lacton', 'acid'],
  ['e621', 'Monosodium glutamate', 'Mononatriumglutamat', 'flavour-enhancer'],
  ['e627', 'Disodium guanylate', 'Dinatriumguanylat', 'flavour-enhancer'],
  ['e631', 'Disodium inosinate', 'Dinatriuminosinat', 'flavour-enhancer'],
  ['e635', "Disodium 5'-ribonucleotides", "Dinatrium-5'-ribonucleotider", 'flavour-enhancer'],
  ['e901', 'Beeswax', 'Bivoks', 'other', 'Not vegan.'],
  ['e903', 'Carnauba wax', 'Carnaubavoks', 'other'],
  ['e904', 'Shellac', 'Shellak', 'other', 'Made from insects; not vegan.'],
  ['e920', 'L-cysteine', 'L-cystein', 'other'],
  ['e941', 'Nitrogen', 'Nitrogen', 'other', undefined, undefined, undefined, []],
  ['e950', 'Acesulfame K', 'Acesulfam K', 'sweetener'],
  ['e951', 'Aspartame', 'Aspartam', 'sweetener', 'Permitted in the EU. IARC classified it as possibly carcinogenic (2B) in 2023; JECFA kept the acceptable daily intake.', undefined, ASPARTAME],
  ['e952', 'Cyclamates', 'Cyclamat', 'sweetener'],
  ['e954', 'Saccharins', 'Saccharin', 'sweetener'],
  ['e955', 'Sucralose', 'Sucralose', 'sweetener'],
  ['e960', 'Steviol glycosides', 'Steviolglycosider', 'sweetener'],
  ['e965', 'Maltitols', 'Maltitol', 'sweetener', 'Large amounts can have a laxative effect.'],
  ['e967', 'Xylitol', 'Xylitol', 'sweetener'],
  ['e1422', 'Acetylated distarch adipate', 'Acetyleret distivelsesadipat', 'thickener', 'A modified starch.'],
  ['e1442', 'Hydroxypropyl distarch phosphate', 'Hydroxypropyleret distivelsesfosfat', 'thickener', 'A modified starch.'],
];

export const ADDITIVES: Record<string, AdditiveInfo> = Object.fromEntries(
  ROWS.map(([code, en, da, group, why, high, source, match]) => [code, {
    code, en, da, group,
    concern: high ?? 'low',
    why: why ?? 'Authorised in the EU; no specific concern noted.',
    source: source ?? EU,
    // Names shorter than 8 letters (e.g. "Agar") are too ambiguous to match in free text.
    match: match ?? (da.length >= 8 ? [da.toLowerCase()] : []),
  }]),
);

// OFF tags sub-variants like 'e322i' or 'e450iii'; fall back to the base code.
export function lookupAdditive(code: string): AdditiveInfo | undefined {
  return ADDITIVES[code] ?? ADDITIVES[code.replace(/(i{1,3}|iv|vi?)$/, '')] ?? ADDITIVES[code.replace(/[a-z]+$/, '')];
}
