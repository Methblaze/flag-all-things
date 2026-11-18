import { findENumbers, findAllergens, sugarIsMainIngredient, mentionsPalmOil } from '@/engine/parse';

test('E-numbers in messy formats plus Danish names', () =>
  expect(findENumbers('Salt, konserveringsmiddel (E 250), e-301, E160a, farvestof: E\n150d, natriumnitrit'))
    .toEqual(['e250', 'e301', 'e160a', 'e150d']));
test('no false E-numbers', () => expect(findENumbers('Vitamin E, Energi 100 g')).toEqual([]));

test('Danish allergens, contains vs traces', () =>
  expect(findAllergens('Hvedemel, sukker, MÆLKEPULVER, æg. Kan indeholde spor af hasselnødder og sesam.'))
    .toEqual({ contains: ['gluten', 'milk', 'eggs'], traces: ['nuts', 'sesame'] }));
test('"æg" inside "nettovægt" and "rug" inside "frugt" do not count', () =>
  expect(findAllergens('Nettovægt 500 g. Rugmel, frugt, vand.').contains).toEqual(['gluten']));
test('Danish compounds still hit', () => expect(findAllergens('Sødmælk, sennepsfrø').contains).toEqual(['milk', 'mustard']));
test('English traces', () => expect(findAllergens('Oats. May contain traces of peanuts.')).toEqual({ contains: ['gluten'], traces: ['peanuts'] }));

test('sugar first or second is main', () => {
  expect(sugarIsMainIngredient('Sukker, kakaosmør, mælkepulver')).toBe(true);
  expect(sugarIsMainIngredient('Havregryn (100%, fuldkorn), glukosesirup, salt')).toBe(true);
  expect(sugarIsMainIngredient('Rugmel, vand, sukker')).toBe(false);
});
test('palm oil detection', () => {
  expect(mentionsPalmOil('vegetabilske fedtstoffer (palme, raps)')).toBe(true);
  expect(mentionsPalmOil('rapsolie')).toBe(false);
});

test('Danish false friends are not allergens', () =>
  expect(findAllergens('Boghvede, kakaosmør, kokosmælk, mælkesyre, ægte vanilje, muskatnød').contains).toEqual([]));
test('jordnødder is peanuts, not tree nuts', () => expect(findAllergens('Jordnødder, salt').contains).toEqual(['peanuts']));
