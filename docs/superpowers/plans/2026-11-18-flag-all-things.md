# Flag All Things Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Expo app (Android, iOS via Expo Go, web) that scans Danish grocery barcodes or ingredient-label photos and explains every health, additive, allergen and diet flag with a source.

**Architecture:** Two sources feed one engine. Open Food Facts (OFF) lookups and AI label reads both normalise to `Product`. The pure function `analyze(product, prefs)` produces a `FlagReport`. Screens are thin Expo Router routes over plain hooks. AsyncStorage holds history, which doubles as the offline cache. There is no backend.

**Tech Stack:** Expo SDK 58, Expo Router, TypeScript, expo-camera, expo-image-picker, expo-image-manipulator, expo-haptics, expo-secure-store, @react-native-async-storage/async-storage, react-native-reanimated, @anthropic-ai/sdk and zod, with jest-expo and @playwright/test for testing.

**Spec:** `docs/superpowers/specs/2026-11-18-flag-all-things-design.md`. Read it before any task. Section numbers below (§) refer to it.

**Stage map (owner's workflow):**

| Tasks | When | How |
|---|---|---|
| 1–9 (no UI) | Can run any time after Stage 1 | Test-driven, with Jest |
| 10–14 (screens) | Stage 4 | Built with `/hallmark` against `DESIGN.md` (Stage 3) and `docs/superpowers/specs/2026-11-18-flag-all-things-interaction.md` (Stage 2). Each screen has a Playwright spec written first. |
| — | Stage 5 | Motion polish edits the files of Tasks 11–14 only. |
| 15 | Stage 6 | Final verification. |

## Global Constraints

- Only Expo Go-compatible modules. No custom native code, no `expo prebuild`.
- UI copy is in English. Product names and ingredients are shown exactly as printed, with no translation.
- `danger` severity only when the flag conflicts with the user's preferences (`personal: true`). General concerns are at most `warning`.
- Missing allergen data is never shown as "no allergens".
- The API key is stored with `expo-secure-store` (native) or `localStorage` (web). It never goes into `UserPreferences`, the bundle, logs, or any host other than `api.anthropic.com`.
- OFF identification:
  - native: `User-Agent: FlagAllThings/<version> (<OFF_CONTACT>)`
  - web: `app_name=FlagAllThings&app_version=<version>` query parameters
  - `OFF_CONTACT` is the repo or portfolio URL, never an email. It lives in one constant in `src/services/off.ts`.
- OFF: at most one v3 request plus one v2 fallback per lookup, with no automatic retry loops (the limit is 15 reads per minute).
- Claude: model `claude-opus-5-5`, `output_config.effort: "low"`, server-side fallbacks `"default"` (beta `server-side-fallback-2026-07-01`), structured output through `zodOutputFormat`.
- Layout: no horizontal overflow and no clipped text at 375×667.
- Test files live in `src/**/__tests__/*.test.ts`. Fixtures live in `src/**/__fixtures__/`.

## Review Focus

1. **Repeated camera detections.** The camera reports the same barcode many times per second. Expect exactly one navigation and one lookup, not a burst of fetches that exhausts the OFF limit. *(Task 2: `createScanGate` test)*
2. **Web image-picker output.** On the web, the image picker returns a `data:image/...;base64,` URI, and the source may be PNG or HEIC. The request must carry bare base64 JPEG. *(Task 9: data-URI test. Task 13: always re-encode to JPEG.)*
3. **Danish words that contain an allergen word.** In "nettovægt" or "vægt", `æg` is not egg. Allergen words must match at the start of a word. *(Task 3: `findAllergens` false-positive test)*
4. **Partial OFF records.** A product with a name only, French-only text or `"unknown"` grades must give `unknown` or section-missing results, not a crash or a false "good". *(Tasks 6 and 7: partial-fixture tests)*
5. **Corrupt or full storage.** Malformed history JSON, or a web storage quota error, must not crash the app or lose the result on screen. *(Task 8: corrupt-JSON and save-failure tests)*

---

### Task 1: Scaffold, tooling and repo

**Files:**
- Create: Expo project at the repo root (`app/`, `package.json`, `app.json`, `tsconfig.json`)
- Create: `src/__tests__/sanity.test.ts`
- Modify: `app.json`

**Interfaces:**
- Produces: `npm test` (Jest with the `jest-expo` preset), `npx tsc --noEmit`, and the `@/*` path alias pointing to `src/*`.

- [ ] **Step 1: Initialise git.** `git init`, then commit `docs/` as the first commit.
- [ ] **Step 2: Scaffold the app.** Run `npx create-expo-app@latest _scaffold --template default` and move its contents into the repo root. Then run `npm run reset-project` and delete the example screens it moves aside.
  - Check: `app/_layout.tsx` and `app/index.tsx` exist, and `package.json` shows `expo` at `~58`.
- [ ] **Step 3: Add Expo modules.** `npx expo install expo-camera expo-haptics expo-image-picker expo-image-manipulator expo-secure-store @react-native-async-storage/async-storage`
- [ ] **Step 4: Add the Claude SDK and Zod.** `npm i @anthropic-ai/sdk zod`
- [ ] **Step 5: Add test tooling.** `npx expo install jest-expo jest @types/jest -- --save-dev`, then `npm i -D @playwright/test` and `npx playwright install chromium`.
  - In `package.json`, add `"jest": {"preset": "jest-expo", "testPathIgnorePatterns": ["/e2e/"]}` and `"test": "jest"`.
- [ ] **Step 6: Configure the web build.** Set `expo.web.output` to `"single"` in `app.json` (spec §14, SPA deep links). Set `expo.name` to "Flag All Things" and `expo.slug` to "flag-all-things".
- [ ] **Step 7: Write a sanity test.** `src/__tests__/sanity.test.ts`: `test('jest runs', () => expect(1 + 1).toBe(2))`.
- [ ] **Step 8: Verify.** Run `npm test && npx tsc --noEmit && npx expo export -p web`. Expected: 1 test passes, no type errors, and `dist/index.html` exists.
- [ ] **Step 9: Commit.** `git add -A && git commit -m "chore: scaffold Expo SDK 58 app with jest and playwright"`

---

### Task 2: Domain types and barcode handling

**Files:**
- Create: `src/domain/types.ts`, `src/domain/barcode.ts`
- Test: `src/domain/__tests__/barcode.test.ts`

**Interfaces:**
- Produces:
  - Every type in spec §8, verbatim: `AllergenKey`, `Grade`, `ProductSource`, `Product`, `Severity`, `FlagCategory`, `Flag`, `Verdict`, `FlagReport`, `UserPreferences`, `ScanHistoryItem`.
  - `type Rule = (p: Product, prefs: UserPreferences) => Flag[]`
  - `ALLERGEN_KEYS: readonly AllergenKey[]`
  - `DEFAULT_PREFS: UserPreferences` = `{allergens: [], additiveAlerts: [], novaAlert: null, diet: 'none', avoidPalmOil: false}`
  - `type BarcodeCheck = {ok: true; code: string; kind: 'product' | 'store-weighed'} | {ok: false; reason: 'empty' | 'not-digits' | 'length' | 'checksum'}`
  - `checkBarcode(input: string): BarcodeCheck`
  - `createScanGate(windowMs?: number): (code: string, now: number) => boolean` (default window 3000 ms)

- [ ] **Step 1: Write the failing tests**

```ts
import { checkBarcode, createScanGate } from '@/domain/barcode';

test('valid EAN-13 (GS1 Denmark)', () => expect(checkBarcode('5701234567899')).toEqual({ ok: true, code: '5701234567899', kind: 'product' }));
test('strips spaces and dashes', () => expect(checkBarcode(' 570-1234 567899 ')).toMatchObject({ ok: true, code: '5701234567899' }));
test('valid EAN-8', () => expect(checkBarcode('96385074')).toMatchObject({ ok: true, code: '96385074' }));
test('UPC-A padded to 13', () => expect(checkBarcode('036000291452')).toMatchObject({ ok: true, code: '0036000291452' }));
test('bad check digit', () => expect(checkBarcode('5701234567890')).toEqual({ ok: false, reason: 'checksum' }));
test('wrong length', () => expect(checkBarcode('57012')).toEqual({ ok: false, reason: 'length' }));
test('letters', () => expect(checkBarcode('57O1234567899')).toEqual({ ok: false, reason: 'not-digits' }));
test('empty', () => expect(checkBarcode('  ')).toEqual({ ok: false, reason: 'empty' }));
test('store weighed-goods label', () => expect(checkBarcode('2001234001502')).toEqual({ ok: true, code: '2001234001502', kind: 'store-weighed' }));

test('scan gate passes a code once per window', () => {
  const gate = createScanGate(3000);
  expect(gate('5701234567899', 0)).toBe(true);
  expect(gate('5701234567899', 500)).toBe(false);
  expect(gate('96385074', 600)).toBe(true);
  expect(gate('5701234567899', 3601)).toBe(true);
});
```

- [ ] **Step 2: Run to verify they fail.** `npx jest src/domain`. Expected: FAIL, cannot find module `@/domain/barcode`.
- [ ] **Step 3: Implement.**
  - `types.ts`: copy the §8 types and add the constants above.
  - `barcode.ts`, `checkBarcode`:
    - Strip `\s` and `-`.
    - Check the length: 8, 12 or 13. Pad 12 digits to 13 with a leading `0`.
    - Verify the GS1 mod-10 check digit, with weights 3,1 counted from the right excluding the check digit.
    - A 13-digit code starting with `2` is `store-weighed`.
  - `createScanGate`: keep a closure over the last accepted code and its time.
- [ ] **Step 4: Run to verify they pass.** `npx jest src/domain`. Expected: 10 passed.
- [ ] **Step 5: Commit.** `git commit -am "feat(domain): types, barcode validation, scan gate"` (run `git add` on the new files first).

---

### Task 3: Engine data and ingredient-text parsing

**Files:**
- Create: `src/engine/data/additives.ts`, `src/engine/data/allergens.ts`, `src/engine/parse.ts`
- Test: `src/engine/__tests__/parse.test.ts`

**Interfaces:**
- Consumes: `AllergenKey` from Task 2.
- Produces:
  - `interface AdditiveInfo { code: string; en: string; da: string; group: 'colour' | 'preservative' | 'antioxidant' | 'sweetener' | 'emulsifier' | 'thickener' | 'flavour-enhancer' | 'acid' | 'other'; concern: 'high' | 'low'; why: string; source: { label: string; url: string } }`
  - `ADDITIVES: Record<string, AdditiveInfo>` (keys like `'e250'`)
  - `ALLERGEN_WORDS: Record<AllergenKey, string[]>` (Danish and English, lowercase). Words of three letters or fewer (`æg`, `rug`, `byg`, `oat`, `nut`, `egg`, `rye`) match only at the start of a word. Longer words match anywhere, so Danish compounds like `sødmælk` and `hasselnødder` still hit.
  - `ALLERGEN_LABELS: Record<AllergenKey, string>` (English display names, e.g. `milk: 'milk'`, `nuts: 'tree nuts'`)
  - `SUGAR_WORDS: string[]`
  - `findENumbers(text: string): string[]` (normalised, unique, in order of appearance)
  - `findAllergens(text: string): { contains: AllergenKey[]; traces: AllergenKey[] }` (each list unique, in order of first appearance)
  - `sugarIsMainIngredient(text: string): boolean` (sugar in the first two top-level ingredients)
  - `mentionsPalmOil(text: string): boolean`

- [ ] **Step 1: Write the failing tests**

```ts
import { findENumbers, findAllergens, sugarIsMainIngredient, mentionsPalmOil } from '@/engine/parse';

test('E-numbers in messy formats plus Danish names', () =>
  expect(findENumbers('Salt, konserveringsmiddel (E 250), e-301, E160a, farvestof: E\n150d, natriumnitrit'))
    .toEqual(['e250', 'e301', 'e160a', 'e150d']));
test('no false E-numbers', () => expect(findENumbers('Vitamin E, Energi 100 g')).toEqual([]));

test('Danish allergens, contains vs traces', () =>
  expect(findAllergens('Hvedemel, sukker, MÆLKEPULVER, æg. Kan indeholde spor af hasselnødder og sesam.'))
    .toEqual({ contains: ['gluten', 'milk', 'eggs'], traces: ['nuts', 'sesame'] }));
test('"æg" inside "nettovægt" and "rug" inside "frugt" do not count', () => expect(findAllergens('Nettovægt 500 g. Rugmel, frugt, vand.').contains).toEqual(['gluten']));
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
```

- [ ] **Step 2: Run to verify they fail.** `npx jest src/engine/__tests__/parse.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Write the data tables.**
  - `ADDITIVES`: about 60 entries. At minimum it must include every code used in tests: e250, e301, e160a, e150d, e330, e322, e171, e621, e951, e955.
  - Mark `concern: 'high'` only where a cited source supports it:
    - the six "Southampton" colours (EU Reg. 1333/2008 Annex V warning label)
    - nitrites e249–e252 (EFSA 2017/2023)
    - e171 (banned in the EU since 2022)
    - e150c/d (4-MEI)
    - sweeteners with an EFSA or IARC note
  - Every entry has a source URL.
  - `ALLERGEN_WORDS` covers the EU-14 allergens. For example, gluten: `hvede, rug, byg, havre, spelt, kamut, gluten, wheat, rye, barley, oat`. Eggs: `æg, hønseæg, æggehvide, æggeblomme, egg`.
  - `SUGAR_WORDS`: `sukker, rørsukker, glukosesirup, glukose-fruktosesirup, fruktosesirup, dextrose, druesukker, invertsukker, honning, sugar, glucose syrup`.
- [ ] **Step 4: Implement `parse.ts`.**
  - E-numbers: case-insensitive regex `\bE\s*-?\s*(\d{3,4}[a-f]?)\b`, plus a lookup of `ADDITIVES[*].da` names in the lowercased text.
  - Short allergen words (three letters or fewer) match with the lookbehind `(?<![a-zæøå])`. Longer words use a plain substring match on the lowercased text.
  - A traces segment starts at `kan indeholde( spor af)?` or `may contain( traces of)?` and runs to the next `.` or the end of the text. Remove it from the text before scanning for "contains".
  - Split top-level ingredients on commas that sit outside parentheses.
  - Palm oil: `/palme|palm/i`.
- [ ] **Step 5: Run to verify they pass.** Expected: 8 passed.
- [ ] **Step 6: Commit.** `feat(engine): additive and allergen tables, ingredient parsing`

---

### Task 4: Processing and nutrition rules

**Files:**
- Create: `src/engine/rules/processing.ts`, `src/engine/rules/nutrition.ts`, `src/engine/__fixtures__/make.ts`
- Test: `src/engine/__tests__/processing.test.ts`, `src/engine/__tests__/nutrition.test.ts`

**Interfaces:**
- Consumes: the types and `DEFAULT_PREFS` (Task 2), `sugarIsMainIngredient` (Task 3).
- Produces:
  - `processingRule: Rule` (`Rule` comes from Task 2)
  - `nutritionRule: Rule`
  - `makeProduct(overrides?: Partial<Product>): Product`. The default is an all-null OFF product: `allergenDataKnown: false`, empty arrays, `fetchedAt: 0`.
  - `FSA_SOURCE = { label: 'UK FSA front-of-pack criteria', url: 'https://www.food.gov.uk/business-guidance/packaging-and-labelling' }`

- [ ] **Step 1: Write the failing tests** (selected, with exact values)

```ts
// processing
test('NOVA 4 default → warning', () => expect(processingRule(makeProduct({ nova: 4 }), DEFAULT_PREFS)).toEqual([expect.objectContaining({ id: 'processing:nova-4', severity: 'warning', personal: false })]));
test('NOVA 4 with novaAlert 4 → danger', () => expect(processingRule(makeProduct({ nova: 4 }), { ...DEFAULT_PREFS, novaAlert: 4 })[0]).toMatchObject({ severity: 'danger', personal: true }));
test('NOVA 3 with novaAlert 3 → danger', () => expect(processingRule(makeProduct({ nova: 3 }), { ...DEFAULT_PREFS, novaAlert: 3 })[0].severity).toBe('danger'));
test('NOVA 3 default → info', () => expect(processingRule(makeProduct({ nova: 3 }), DEFAULT_PREFS)[0].severity).toBe('info'));
test('NOVA 1 → good', () => expect(processingRule(makeProduct({ nova: 1 }), DEFAULT_PREFS)[0].severity).toBe('good'));
test('NOVA null → none', () => expect(processingRule(makeProduct(), DEFAULT_PREFS)).toEqual([]));

// nutrition
const n = (o: Partial<Product['nutrition']>) => ({ energyKcal: null, sugars: null, saturatedFat: null, salt: null, fiber: null, protein: null, ...o });
test('salt 1.6 g food → high', () => expect(nutritionRule(makeProduct({ nutrition: n({ salt: 1.6 }) }), DEFAULT_PREFS)).toEqual([expect.objectContaining({ id: 'nutrition:salt-high', severity: 'warning', detail: '1.6 g per 100 g — above the 1.5 g "high" level.' })]));
test('salt exactly 1.5 → not high', () => expect(nutritionRule(makeProduct({ nutrition: n({ salt: 1.5 }) }), DEFAULT_PREFS)).toEqual([]));
test('drink sugars 11.3 → high, 11.2 → not', () => {
  expect(nutritionRule(makeProduct({ isBeverage: true, nutrition: n({ sugars: 11.3 }) }), DEFAULT_PREFS)[0].id).toBe('nutrition:sugars-high');
  expect(nutritionRule(makeProduct({ isBeverage: true, nutrition: n({ sugars: 11.2 }) }), DEFAULT_PREFS)).toEqual([]);
});
test('food thresholds', () => {
  const ids = nutritionRule(makeProduct({ nutrition: n({ sugars: 22.6, saturatedFat: 5.1 }) }), DEFAULT_PREFS).map(f => f.id);
  expect(ids).toEqual(expect.arrayContaining(['nutrition:sugars-high', 'nutrition:saturated-fat-high']));
});
test('Nutri-Score', () => {
  expect(nutritionRule(makeProduct({ nutriscore: 'e' }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'nutrition:nutriscore-e', severity: 'warning' });
  expect(nutritionRule(makeProduct({ nutriscore: 'a' }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'nutrition:nutriscore-a', severity: 'good' });
});
test('fibre below 3 g → info', () => expect(nutritionRule(makeProduct({ nutrition: n({ fiber: 2.9 }) }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'nutrition:fiber-low', severity: 'info' }));
test('sugar as main ingredient', () => expect(nutritionRule(makeProduct({ ingredientsText: 'Sukker, kakao' }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'nutrition:sugar-main', severity: 'warning' }));
```

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement both rules** using the thresholds in spec §9.
  - Comparisons are strictly greater-than.
  - Drinks use `per 100 ml` in the detail text.
  - Every nutrition-threshold flag carries `source: FSA_SOURCE`.
  - Titles: `High in salt`, `High in sugars`, `High in saturated fat`, `Nutri-Score E`, `Low in fibre`, `Sugar is a main ingredient`, `Ultra-processed (NOVA 4)`, `Processed (NOVA 3)`, `Minimally processed (NOVA 1)`.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit.** `feat(engine): processing and nutrition rules`

---

### Task 5: Additive, allergen and diet rules

**Files:**
- Create: `src/engine/rules/additives.ts`, `src/engine/rules/allergens.ts`, `src/engine/rules/diet.ts`
- Test: `src/engine/__tests__/additives.test.ts`, `allergens.test.ts`, `diet.test.ts`

**Interfaces:**
- Consumes: `Rule`, `makeProduct` (Task 4), the parse helpers and tables (Task 3).
- Produces: `additivesRule`, `allergensRule`, `dietRule`, all of type `Rule`.

- [ ] **Step 1: Write the failing tests**

```ts
// additives — merges product.additives with text-parsed E-numbers
test('high-concern → warning with source', () => expect(additivesRule(makeProduct({ additives: ['e250'] }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'additive:e250', severity: 'warning', source: expect.objectContaining({ url: expect.stringMatching(/^https:/) }) }));
test('low-concern → info', () => expect(additivesRule(makeProduct({ additives: ['e330'] }), DEFAULT_PREFS)[0].severity).toBe('info'));
test('unknown code → info "no notes"', () => expect(additivesRule(makeProduct({ additives: ['e999'] }), DEFAULT_PREFS)[0]).toMatchObject({ severity: 'info', detail: expect.stringContaining('No notes') }));
test('user alert → danger', () => expect(additivesRule(makeProduct({ additives: ['e330'] }), { ...DEFAULT_PREFS, additiveAlerts: ['e330'] })[0]).toMatchObject({ severity: 'danger', personal: true }));
test('text merge, no duplicates', () => expect(additivesRule(makeProduct({ additives: ['e250'], ingredientsText: 'salt, E250, E330' }), DEFAULT_PREFS).map(f => f.id)).toEqual(['additive:e250', 'additive:e330']));

// allergens
const milkPref = { ...DEFAULT_PREFS, allergens: ['milk'] as AllergenKey[] };
test('my allergen present → danger', () => expect(allergensRule(makeProduct({ allergens: ['milk'], allergenDataKnown: true }), milkPref)[0]).toMatchObject({ id: 'allergen:milk', severity: 'danger', title: 'Contains milk — on your alert list' }));
test('my allergen as traces → warning', () => expect(allergensRule(makeProduct({ traces: ['milk'], allergenDataKnown: true }), milkPref)[0]).toMatchObject({ id: 'allergen:milk-traces', severity: 'warning' }));
test('other allergen → info', () => expect(allergensRule(makeProduct({ allergens: ['gluten'], allergenDataKnown: true }), milkPref)[0].severity).toBe('info'));
test('unknown data + my list → warning', () => expect(allergensRule(makeProduct({ allergenDataKnown: false }), milkPref)).toEqual([expect.objectContaining({ id: 'allergen:unknown', severity: 'warning' })]));
test('text-parsed allergens count', () => expect(allergensRule(makeProduct({ ingredientsText: 'Sødmælk, salt', allergenDataKnown: true }), milkPref)[0].id).toBe('allergen:milk'));

// diet
test('vegan diet, not vegan → danger', () => expect(dietRule(makeProduct({ diet: { vegan: false, vegetarian: true, palmOil: null } }), { ...DEFAULT_PREFS, diet: 'vegan' })[0]).toMatchObject({ id: 'diet:not-vegan', severity: 'danger' }));
test('vegan diet, unknown → warning', () => expect(dietRule(makeProduct(), { ...DEFAULT_PREFS, diet: 'vegan' })[0]).toMatchObject({ id: 'diet:vegan-unknown', severity: 'warning' }));
test('palm oil from text when tags are null', () => expect(dietRule(makeProduct({ ingredientsText: 'palmeolie, sukker' }), { ...DEFAULT_PREFS, avoidPalmOil: true })[0]).toMatchObject({ id: 'diet:palm-oil', severity: 'danger' }));
test('palm oil without preference → info', () => expect(dietRule(makeProduct({ diet: { vegan: null, vegetarian: null, palmOil: true } }), DEFAULT_PREFS)[0].severity).toBe('info'));
test('Eco-Score', () => {
  expect(dietRule(makeProduct({ ecoscore: 'a' }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'diet:ecoscore-a', severity: 'good' });
  expect(dietRule(makeProduct({ ecoscore: 'e' }), DEFAULT_PREFS)[0]).toMatchObject({ id: 'diet:ecoscore-e', severity: 'info' });
});
```

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement the three rules** following spec §9.
  - The allergen rule merges `product.allergens` and `product.traces` with `findAllergens(ingredientsText)`. Contains outranks traces for the same key.
  - Allergen titles use `ALLERGEN_LABELS`.
  - The palm-oil fallback is `mentionsPalmOil` when `diet.palmOil === null`.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit.** `feat(engine): additive, allergen and diet rules`

---

### Task 6: `analyze()`: verdict, headline, counts, missing sections

**Files:**
- Create: `src/engine/analyze.ts`
- Test: `src/engine/__tests__/analyze.test.ts`

**Interfaces:**
- Consumes: all five rules (Tasks 4 and 5).
- Produces: `analyze(product: Product, prefs: UserPreferences): FlagReport`

- [ ] **Step 1: Write the failing tests**

```ts
test('no ingredients and no nutrition → unknown', () => expect(analyze(makeProduct({ name: 'X' }), DEFAULT_PREFS)).toMatchObject({ verdict: 'unknown', headline: 'Not enough data to judge' }));
test('personal allergen → avoid, headline from top flag', () => expect(analyze(makeProduct({ ingredientsText: 'Mælk', allergens: ['milk'], allergenDataKnown: true, nova: 4 }), { ...DEFAULT_PREFS, allergens: ['milk'] })).toMatchObject({ verdict: 'avoid', headline: 'Contains milk — on your alert list' }));
test('warnings only → caution', () => expect(analyze(makeProduct({ ingredientsText: 'x', nova: 4 }), DEFAULT_PREFS).verdict).toBe('caution'));
test('good signals, no warnings → good', () => expect(analyze(makeProduct({ ingredientsText: 'Rugmel', nova: 1, nutriscore: 'a' }), DEFAULT_PREFS).verdict).toBe('good'));
test('info only → ok', () => expect(analyze(makeProduct({ ingredientsText: 'x', nova: 3 }), DEFAULT_PREFS).verdict).toBe('ok'));
test('flags sorted danger, warning, info, good, and counts match', () => {
  const r = analyze(makeProduct({ ingredientsText: 'Mælk, E330', allergenDataKnown: true, nova: 4, nutriscore: 'a' }), { ...DEFAULT_PREFS, allergens: ['milk'] });
  expect(r.flags.map(f => f.severity)).toEqual(['danger', 'warning', 'info', 'good']);
  expect(r.counts).toEqual({ danger: 1, warning: 1, info: 1, good: 1 });
});
test('missing sections listed', () => expect(analyze(makeProduct({ ingredientsText: 'x' }), DEFAULT_PREFS).missing).toEqual(expect.arrayContaining(['processing', 'nutrition'])));
test('deterministic', () => { const p = makeProduct({ ingredientsText: 'Sukker, E250', nova: 4 }); expect(analyze(p, DEFAULT_PREFS)).toEqual(analyze(p, DEFAULT_PREFS)); });
```

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement.**
  - Concatenate the rules' flags.
  - Sort with a stable sort: first by severity (danger, warning, info, good), then by category in the order allergens, diet, additives, nutrition, processing.
  - Verdict as in spec §9.
  - Headline: `'Not enough data to judge'` when the verdict is `unknown`. Otherwise `flags[0].title`, or `'No concerns found'` when there are no flags.
  - `missing` rules:
    - processing: `nova` is null
    - nutrition: every nutrition value is null and `nutriscore` is null
    - additives: there is no ingredient text and `additives` is empty
    - allergens: `allergenDataKnown` is false
    - diet: all diet values are null, there is no Eco-Score and there is no ingredient text
- [ ] **Step 4: Run to verify they pass.** Then run `npm test`. Expected: all suites pass.
- [ ] **Step 5: Commit.** `feat(engine): analyze with verdict and headline`

---

### Task 7: Open Food Facts service, real Danish fixtures and example barcodes

**Files:**
- Create: `src/services/off.ts`, `src/services/__fixtures__/off/*.json`, `src/services/examples.ts`
- Test: `src/services/__tests__/off.test.ts`

**Interfaces:**
- Consumes: `Product`, `checkBarcode`.
- Produces:
  - `OFF_CONTACT: string` (placeholder `'https://github.com/<owner>/flag-all-things'` until the repo exists)
  - `OFF_FIELDS: string` (the comma-separated field list)
  - `type OffResult = { kind: 'found'; product: Product } | { kind: 'not-found' } | { kind: 'busy' } | { kind: 'offline' }`
  - `normalizeOff(raw: unknown, fetchedAt: number): Product | null`
  - `fetchProduct(code: string, opts?: { fetchImpl?: typeof fetch; platform?: 'web' | 'ios' | 'android'; now?: () => number }): Promise<OffResult>`
  - `EXAMPLE_BARCODES: { code: string; label: string }[]` (3–4 entries)

- [ ] **Step 1: Find the example products.**
  - Query `https://world.openfoodfacts.org/api/v2/search?countries_tags_en=denmark&fields=code,product_name,nova_group,nutriscore_grade,ingredients_text_da&page_size=50` with the native User-Agent.
  - Pick 4 products with 570/571 barcodes that have Danish ingredients and differing expected verdicts: a rye bread (good or ok), a soft drink (caution, sugars), a candy (caution, NOVA 4 or additives) and a skyr or milk product (avoid with a milk preference).
- [ ] **Step 2: Save the fixtures.**
  - Save each product's live v3 response (`/api/v3/product/{code}?fields=OFF_FIELDS`) to `__fixtures__/off/<code>.json`.
  - Save one v2 response as `v2-<code>.json`.
  - Hand-write `partial-name-only.json`: `{ "code": "5700000000001", "status": "success", "product": { "product_name_fr": "Pain", "nutriscore_grade": "unknown" } }`
  - Hand-write `not-found.json`.
  - Record the real v3 shape (the status values, where `product` sits) in a short comment at the top of `off.ts`.
- [ ] **Step 3: Write the failing tests**

```ts
test('normalises a real Danish v3 product', () => {
  const p = normalizeOff(require('../__fixtures__/off/<rye-code>.json'), 1)!;
  expect(p).toMatchObject({ barcode: '<rye-code>', source: 'off', fetchedAt: 1 });
  expect(p.name).toBeTruthy(); expect(p.ingredientsText).toMatch(/rug/i);
});
test('tag prefixes stripped, unknown tags dropped, odd grades → null', () => {
  const p = normalizeOff({ code: '5701234567899', product: { additives_tags: ['en:e322i'], allergens_tags: ['en:milk', 'en:nuts', 'en:banana'], nutriscore_grade: 'not-applicable', environmental_score_grade: 'b', categories_tags: ['en:beverages'] } }, 0)!;
  expect(p).toMatchObject({ additives: ['e322i'], allergens: ['milk', 'nuts'], nutriscore: null, ecoscore: 'b', isBeverage: true, allergenDataKnown: true });
});
test('name-only partial record', () => expect(normalizeOff(require('../__fixtures__/off/partial-name-only.json'), 0)).toMatchObject({ name: 'Pain', nutriscore: null, ingredientsText: null, allergenDataKnown: false }));

const res = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
test('v3 hit → found, no v2 call', async () => {
  const f = jest.fn(() => res(200, require('../__fixtures__/off/<rye-code>.json')));
  expect((await fetchProduct('<rye-code>', { fetchImpl: f, platform: 'ios' })).kind).toBe('found');
  expect(f).toHaveBeenCalledTimes(1);
});
test('v3 404 → not-found, no v2 call', async () => { const f = jest.fn(() => res(404, {})); expect(await fetchProduct('5701234567899', { fetchImpl: f })).toEqual({ kind: 'not-found' }); expect(f).toHaveBeenCalledTimes(1); });
test('network error on v3 → v2 fallback', async () => { const f = jest.fn().mockRejectedValueOnce(new TypeError('net')).mockImplementationOnce(() => res(200, require('../__fixtures__/off/v2-<code>.json'))); expect((await fetchProduct('<code>', { fetchImpl: f })).kind).toBe('found'); expect(f.mock.calls[1][0]).toContain('/api/v2/'); });
test('both fail on network → offline', async () => expect(await fetchProduct('5701234567899', { fetchImpl: jest.fn().mockRejectedValue(new TypeError('net')) })).toEqual({ kind: 'offline' }));
test('429 → busy, no fallback', async () => { const f = jest.fn(() => res(429, {})); expect(await fetchProduct('5701234567899', { fetchImpl: f })).toEqual({ kind: 'busy' }); expect(f).toHaveBeenCalledTimes(1); });
test('503 then 503 → busy', async () => expect(await fetchProduct('5701234567899', { fetchImpl: jest.fn(() => res(503, {})) })).toEqual({ kind: 'busy' }));
test('web identifies by query string, native by User-Agent', async () => {
  const f = jest.fn(() => res(404, {}));
  await fetchProduct('5701234567899', { fetchImpl: f, platform: 'web' });
  expect(f.mock.calls[0][0]).toMatch(/app_name=FlagAllThings/); expect(f.mock.calls[0][1]?.headers?.['User-Agent']).toBeUndefined();
  await fetchProduct('5701234567899', { fetchImpl: f, platform: 'ios' });
  expect(f.mock.calls[1][1].headers['User-Agent']).toMatch(/^FlagAllThings\/\d+\.\d+\.\d+ \(https:/);
});
```

- [ ] **Step 4: Run to verify they fail.**
- [ ] **Step 5: Implement.**
  - Name priority: `product_name_da` → `product_name` → `product_name_en` → the first `product_name_*`.
  - Ingredient priority: `ingredients_text_da` → `_en` → `ingredients_text`.
  - Diet booleans from `ingredients_analysis_tags` and `labels_tags`: `en:vegan` / `en:non-vegan`, `en:vegetarian` / `en:non-vegetarian`, `en:palm-oil` / `en:palm-oil-free`. Anything else is null.
  - `allergenDataKnown` = `allergens_tags` is non-empty, or there is ingredient text.
  - The version comes from `expo-constants` `expoConfig.version`, and the platform from `Platform.OS`.
- [ ] **Step 6: Run to verify they pass.**
- [ ] **Step 7: Commit.** `feat(services): Open Food Facts lookup with v3→v2 fallback and Danish fixtures`

---

### Task 8: Storage for history, cache, preferences and API key

**Files:**
- Create: `src/services/storage.ts`
- Test: `src/services/__tests__/storage.test.ts`

**Interfaces:**
- Consumes: `Product`, `Verdict`, `ScanHistoryItem`, `UserPreferences`, `DEFAULT_PREFS`.
- Produces:
  - `HISTORY_CAP = 200`
  - `loadHistory(): Promise<ScanHistoryItem[]>`
  - `saveScan(product: Product, verdict: Verdict, now?: number): Promise<ScanHistoryItem[]>`
  - `removeScan(id: string): Promise<ScanHistoryItem[]>`
  - `restoreScan(item: ScanHistoryItem): Promise<ScanHistoryItem[]>`
  - `findCached(barcode: string): Promise<Product | null>`
  - `isStale(p: Product, now: number): boolean` (older than 24 h)
  - `loadPrefs(): Promise<UserPreferences>`
  - `savePrefs(p: UserPreferences): Promise<void>`
  - `getApiKey(): Promise<string | null>`
  - `setApiKey(key: string | null): Promise<void>`
  - Storage keys: `fat:history:v1`, `fat:prefs:v1`, `fat.anthropic-key` (SecureStore allows only letters, digits, `.`, `-`, `_`)

- [ ] **Step 1: Write the failing tests.** Mock AsyncStorage with `@react-native-async-storage/async-storage/jest/async-storage-mock` and expo-secure-store with an in-memory `jest.mock`.

```ts
test('newest first, same id replaces', async () => {
  await saveScan(makeProduct({ barcode: 'a' }), 'ok', 1); await saveScan(makeProduct({ barcode: 'b' }), 'ok', 2);
  const h = await saveScan(makeProduct({ barcode: 'a' }), 'caution', 3);
  expect(h.map(i => [i.id, i.verdict])).toEqual([['a', 'caution'], ['b', 'ok']]);
});
test('label read without barcode gets a label id', async () => expect((await saveScan(makeProduct({ barcode: null, source: 'label-ai' }), 'ok', 42))[0].id).toBe('label:42'));
test('capped at 200', async () => { for (let i = 0; i < 205; i++) await saveScan(makeProduct({ barcode: String(i) }), 'ok', i); expect((await loadHistory()).length).toBe(200); });
test('remove then restore keeps the original position', async () => { /* save a@1, b@2; remove a; restore a → ['b','a'] */ });
test('findCached', async () => { await saveScan(makeProduct({ barcode: 'x', name: 'Skyr' }), 'ok', 1); expect((await findCached('x'))?.name).toBe('Skyr'); expect(await findCached('nope')).toBeNull(); });
test('corrupt history JSON → []', async () => { await AsyncStorage.setItem('fat:history:v1', '{oops'); expect(await loadHistory()).toEqual([]); });
test('save failure rejects and leaves stored history intact', async () => { /* setItem mockRejectedValueOnce(new Error('QuotaExceeded')) → saveScan rejects; loadHistory still returns previous items */ });
test('prefs default and merge', async () => { expect(await loadPrefs()).toEqual(DEFAULT_PREFS); await AsyncStorage.setItem('fat:prefs:v1', JSON.stringify({ diet: 'vegan' })); expect(await loadPrefs()).toEqual({ ...DEFAULT_PREFS, diet: 'vegan' }); });
test('isStale at 24h', () => { expect(isStale(makeProduct({ fetchedAt: 0 }), 86_400_000)).toBe(false); expect(isStale(makeProduct({ fetchedAt: 0 }), 86_400_001)).toBe(true); });
test('api key round trip, null clears', async () => { await setApiKey('sk-test'); expect(await getApiKey()).toBe('sk-test'); await setApiKey(null); expect(await getApiKey()).toBeNull(); });
```

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement.**
  - On native, the API key goes to `SecureStore`. On web (`Platform.OS === 'web'`), it goes to `localStorage`, with both calls wrapped in try/catch.
  - `restoreScan` re-inserts the item, then re-sorts by `scannedAt` descending.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit.** `feat(services): history cache, prefs and key storage`

---

### Task 9: Label-photo service (`analyzeIngredientPhoto`)

**Files:**
- Create: `src/services/label.ts`, `src/services/example-label.ts` (used at runtime, so it does not go in `__fixtures__`)
- Test: `src/services/__tests__/label.test.ts`

**Interfaces:**
- Consumes: `analyze`, `Product`, `ALLERGEN_KEYS`, `getApiKey`.
- Produces:
  - `class LabelError extends Error { code: 'unreadable' | 'bad-key' | 'network' | 'refused' | 'invalid-response' }`
  - `LabelSchema`: a zod object `{ readable: boolean, name: string|null, brand: string|null, ingredients_text: string|null, allergens: AllergenKey[], traces: AllergenKey[], nutrition: { energy_kcal, sugars, saturated_fat, salt, fiber, protein: number|null }, is_beverage: boolean }`
  - `analyzeIngredientPhoto(base64Image: string, prefs: UserPreferences, opts?: { barcode?: string | null; apiKey?: string | null; client?: { beta: { messages: { parse: Function } } }; now?: number }): Promise<{ product: Product; report: FlagReport }>`
  - `EXAMPLE_LABEL_PRODUCT: Product` (`source: 'example'`, a plausible Danish leverpostej)

- [ ] **Step 1: Check the SDK surface.** Grep the installed SDK for `dangerouslyAllowBrowser`, `beta.messages.parse` / `parse(` and `zodOutputFormat`. If `beta.messages.parse` is absent, use `beta.messages.create` with `output_config.format: zodOutputFormat(LabelSchema)`, and run `LabelSchema.safeParse(JSON.parse(text))` on the response yourself. Keep the tests' mocked method name in sync with whichever you choose.
- [ ] **Step 2: Write the failing tests**

```ts
const ok = { stop_reason: 'end_turn', parsed_output: { readable: true, name: 'Rugbrød', brand: null, ingredients_text: 'Rugmel, vand, salt', allergens: ['gluten'], traces: [], nutrition: { energy_kcal: 210, sugars: 1, saturated_fat: 0.3, salt: 1.1, fiber: 7, protein: 6 }, is_beverage: false } };
const client = (impl: () => unknown) => ({ beta: { messages: { parse: jest.fn(impl) } } });

test('no key → example product, no API call', async () => { const c = client(() => ok); const r = await analyzeIngredientPhoto('AAAA', DEFAULT_PREFS, { apiKey: null, client: c }); expect(r.product.source).toBe('example'); expect(c.beta.messages.parse).not.toHaveBeenCalled(); });
test('with key → label-ai product scored by the engine', async () => {
  const c = client(() => ok);
  const r = await analyzeIngredientPhoto('AAAA', DEFAULT_PREFS, { apiKey: 'k', client: c, barcode: '5701234567899', now: 5 });
  expect(r.product).toMatchObject({ source: 'label-ai', barcode: '5701234567899', allergens: ['gluten'], allergenDataKnown: true, fetchedAt: 5, nutrition: expect.objectContaining({ fiber: 7 }) });
  expect(r.report).toEqual(analyze(r.product, DEFAULT_PREFS));
});
test('request shape', async () => {
  const c = client(() => ok); await analyzeIngredientPhoto('data:image/jpeg;base64,AAAA', DEFAULT_PREFS, { apiKey: 'k', client: c });
  const req = c.beta.messages.parse.mock.calls[0][0];
  expect(req).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'], output_config: expect.objectContaining({ effort: 'low' }) });
  expect(JSON.stringify(req.messages)).toContain('"data":"AAAA"'); expect(JSON.stringify(req.messages)).toContain('"media_type":"image/jpeg"');
});
test.each([
  [{ ...ok, parsed_output: { ...ok.parsed_output, readable: false } }, 'unreadable'],
  [{ stop_reason: 'refusal', parsed_output: null }, 'refused'],
  [{ stop_reason: 'max_tokens', parsed_output: null }, 'invalid-response'],
  [{ stop_reason: 'end_turn', parsed_output: null }, 'invalid-response'],
])('%#: bad responses → LabelError', async (resp, code) => await expect(analyzeIngredientPhoto('AAAA', DEFAULT_PREFS, { apiKey: 'k', client: client(() => resp) })).rejects.toMatchObject({ code }));
test('401 → bad-key; connection error → network', async () => {
  await expect(analyzeIngredientPhoto('A', DEFAULT_PREFS, { apiKey: 'k', client: client(() => { throw new Anthropic.AuthenticationError(401, undefined, 'x', new Headers()); }) })).rejects.toMatchObject({ code: 'bad-key' });
  await expect(analyzeIngredientPhoto('A', DEFAULT_PREFS, { apiKey: 'k', client: client(() => { throw new Anthropic.APIConnectionError({ message: 'x' }); }) })).rejects.toMatchObject({ code: 'network' });
});
```

  The error-class constructor arguments above are illustrative. Match them to the installed SDK's signatures, which the compiler will report.
- [ ] **Step 3: Run to verify they fail.**
- [ ] **Step 4: Implement.**
  - The default client is `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })`, created per call with the key from `opts.apiKey ?? await getApiKey()`.
  - Strip the data-URI prefix with `/^data:[^,]+,/`.
  - Content order: the image block, then a text instruction.
  - System prompt, in substance:
    - "Transcribe the Danish or English food label exactly. Do not judge or infer."
    - "Allergens are the words printed in bold or capitals in the ingredient list; map them to the given keys."
    - "Traces come from 'kan indeholde (spor af)' / 'may contain'."
    - "Nutrition values are per 100 g / 100 ml from the varedeklaration table."
    - "Use null for anything not legible. Set readable=false if this is not a food label."
  - `max_tokens: 16000`.
  - Map the parsed output to `Product`:
    - `ingredientsText` = `ingredients_text`
    - `additives: []` (the engine parses the text)
    - `diet` all null
    - `allergenDataKnown` = `ingredients_text !== null`
    - `nova`, `nutriscore` and `ecoscore` null
    - `name` falls back to `'Unnamed product'`
  - Catch SDK errors most-specific first: `AuthenticationError` → `bad-key`, `APIConnectionError` → `network`, anything else → rethrow.
- [ ] **Step 5: Run to verify they pass.**
- [ ] **Step 6: Commit.** `feat(services): label-photo extraction into the shared engine`

---

### Tasks 10–14: Screens (Stage 4 via `/hallmark`)

**Shared rules for every screen task:**
- Visuals come from `DESIGN.md` tokens only.
- States and copy come from the Stage 2 interaction spec.
- Wrap each screen in `SafeAreaView`/insets.
- Tap targets are at least 44×44 pt.
- Prices and numbers use `fontVariant: ['tabular-nums']`.
- Every element the e2e tests query carries the `testID` listed.
- E2E tests stub OFF with `page.route(/openfoodfacts\.org\/api/, …)` serving Task 7 fixtures. They never hit the live API.
- Each screen task follows the same cycle: write its Playwright spec → run it and see it fail → build with `/hallmark` → run it and see it pass at both `iphone-se` (375×667) and `desktop` (1280×800) → commit.

### Task 10: App shell, Settings and Playwright setup

**Files:**
- Create: `src/theme/tokens.ts`, `src/theme/useTheme.ts`, `app/(tabs)/_layout.tsx`, `app/(tabs)/settings.tsx`, `src/hooks/usePrefs.ts`, `playwright.config.ts`, `e2e/helpers.ts`, `e2e/settings.spec.ts`
- Modify: `app/_layout.tsx` (load fonts and hold the splash screen, per DESIGN.md §11)
- Delete: the `app/index.tsx` left by the reset script

**Interfaces:**
- Produces:
  - `usePrefs(): { prefs: UserPreferences; setPrefs(next: UserPreferences): void }` (optimistic: the state updates immediately, then the save runs)
  - `e2e/helpers.ts`:
    - `stubOff(page, fixtures: Record<string, object | 404>)`
    - `noHorizontalOverflow(page): Promise<void>`, which asserts `document.documentElement.scrollWidth <= innerWidth`

- [ ] **Step 0: Set up the theme.**
  - Run `npx expo install expo-font @expo-google-fonts/figtree @expo-google-fonts/noto-sans`.
  - Transcribe DESIGN.md §2–§8 into `tokens.ts`, keeping the hex values exactly as written.
  - `useTheme()` returns `light` or `dark` from `useColorScheme()`.
  - On the web, iOS and Android, check that Noto Sans renders `tabular-nums` (DESIGN.md §3). Record the result in a comment in `tokens.ts`.
- [ ] **Step 1: Configure Playwright.**
  - `webServer: { command: 'npx expo start --web --port 8081', url: 'http://localhost:8081', reuseExistingServer: true, timeout: 180_000, env: { CI: '1' } }`
  - Projects `iphone-se` (`viewport: {width: 375, height: 667}`, `isMobile: true`, `hasTouch: true`) and `desktop`.
- [ ] **Step 2: Write `e2e/settings.spec.ts`.**
  - The tab bar shows the labels Scan, History and Settings.
  - On Settings, turning on the `pref-allergen-milk` switch survives a reload.
  - Entering a key in `pref-api-key` and saving shows the masked text "Key saved"; "Remove key" clears it.
  - `noHorizontalOverflow` passes.
- [ ] **Step 3: Run to verify it fails.** `npx playwright test e2e/settings.spec.ts`
- [ ] **Step 4: Build the tab layout and Settings screen** with `/hallmark`. Sections, in order:
  1. Allergens: the EU-14 switches
  2. Diet: a segmented control (None / Vegetarian / Vegan)
  3. Alerts: NOVA alert (Off / NOVA 3+ / NOVA 4), palm oil, an E-number list with add and remove
  4. AI label reading: the key field and the line "Stored only on this device"
- [ ] **Step 5: Run to verify it passes, then commit.** `feat(app): tab shell and settings`

### Task 11: Scan screen

**Files:**
- Create: `app/(tabs)/index.tsx`, `src/components/ManualEntry.tsx`, `e2e/scan.spec.ts`

**Interfaces:**
- Consumes: `checkBarcode`, `createScanGate`, `EXAMPLE_BARCODES`.
- Produces: navigation to `/product/[barcode]` for a valid product code. A `store-weighed` code shows an inline message instead of navigating.

- [ ] **Step 1: Write `e2e/scan.spec.ts`.** Headless Chromium has no camera, so the manual entry and examples path is the one under test.
  - With no camera, the `manual-entry` input and the `example-barcodes` list are visible.
  - Typing `5701234567890` and submitting shows "That barcode doesn't add up — check the last digit", the URL is unchanged, and the field keeps its text.
  - Typing `2001234001502` shows "This is a store's own price label — scan the ingredient label instead".
  - Clicking the first example navigates to `/product/<code>`.
  - `noHorizontalOverflow`.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Build with `/hallmark`.**
  - `CameraView` with `barcodeScannerSettings: { barcodeTypes: ['ean13', 'ean8', 'upc_a'] }`.
  - `onBarcodeScanned` → `createScanGate` → `checkBarcode` → `Haptics.notificationAsync(Success)` on native → `router.push`.
  - The torch button renders only when `enableTorch` works. It is hidden on web Safari: on the web, render it only after the camera reports the `torch` capability.
  - Camera permission states: undetermined, denied (manual entry becomes primary, plus a "Open settings" link on native) and unavailable.
  - Examples show on the web, and on native only when there is no camera.
- [ ] **Step 4: Run to verify it passes, then commit.** `feat(app): scan screen`

### Task 12: Product result screen and `useProduct`

**Files:**
- Create: `app/product/[barcode].tsx`, `src/hooks/useProduct.ts`, `src/components/SummaryCard.tsx`, `src/components/FlagSection.tsx`, `e2e/product.spec.ts`

**Interfaces:**
- Consumes: `fetchProduct`, `findCached`, `isStale`, `saveScan`, `analyze`, `usePrefs`.
- Produces: `useProduct(barcode: string): { status: 'loading' | 'ready' | 'not-found' | 'busy' | 'offline'; product: Product | null; report: FlagReport | null; refreshing: boolean; retry(): void }`
  - Cache first: if a cached product exists, the status is `ready` immediately, and a refetch runs when it is stale.
  - Every successful fetch calls `saveScan`.
  - The report is recomputed from the current prefs on each render (memoised).

- [ ] **Step 1: Write `e2e/product.spec.ts`.**
  - The rye fixture shows the `verdict` and `headline` test IDs, with the section headers in this order: Allergens & traces, Diet & ethics, Additives, Nutrition, Processing.
  - Tapping `section-additives` flips its `aria-expanded`. Once expanded, tapping its first flag row shows a "Source:" link.
  - The name-only partial fixture shows the verdict "Unknown" and a "Scan ingredient label" button under the summary card.
  - A 404 stub shows "Not in Open Food Facts yet", the primary button "Scan ingredient label" (leads to `/label?barcode=…`) and the secondary "Enter a different barcode".
  - A 429 stub shows text matching `/busy/i` and a Retry button.
  - With milk turned on in Settings, the skyr fixture shows the verdict `Avoid`.
  - A section with no data shows "Not on record".
  - `noHorizontalOverflow`, and the headline `toBeInViewport()` at 375×667.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Build with `/hallmark`.**
  - Show a skeleton while `loading`.
  - Show an "Offline · saved <date>" banner when the product came from the cache and the refetch reported offline.
  - Show the example banner when `source === 'example'`.
- [ ] **Step 4: Run to verify it passes, then commit.** `feat(app): product result with summary and flag sections`

### Task 13: Label-photo screen

**Files:**
- Create: `app/label.tsx`, `src/services/label-image.ts`, `e2e/label.spec.ts`, `e2e/fixtures/label.jpg`

**Interfaces:**
- Consumes: `analyzeIngredientPhoto`, `saveScan`, `usePrefs`.
- Produces: `prepareLabelImage(uri: string): Promise<string>`. It resizes so the longest edge is 1568 px, re-encodes as JPEG at quality 0.7 with `expo-image-manipulator`, and returns base64.

- [ ] **Step 1: Write `e2e/label.spec.ts`.**
  - With no key, open `/label?barcode=5701234567899`.
  - Click `label-pick`, then `page.waitForEvent('filechooser')` → `setFiles('e2e/fixtures/label.jpg')`.
  - Expect the banner "Example result — add your key in Settings to read real labels", plus `verdict`.
  - History does **not** contain that barcode. Example results are never saved, so fake data can't be cached under a real barcode.
  - `noHorizontalOverflow`.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Build with `/hallmark`.**
  - Native uses `launchCameraAsync`, with a secondary "Choose from library". Web uses `launchImageLibraryAsync`.
  - Always pass the result through `prepareLabelImage`. Never send the picker's own base64.
  - Error states for each `LabelError.code`. `bad-key` links to Settings. The rest offer "Try again" and keep the chosen photo.
- [ ] **Step 4: Run to verify it passes, then commit.** `feat(app): ingredient-label fallback`

### Task 14: History screen

**Files:**
- Create: `app/(tabs)/history.tsx`, `src/components/UndoToast.tsx`, `e2e/history.spec.ts`

**Interfaces:**
- Consumes: `loadHistory`, `removeScan`, `restoreScan`.
- Produces: `UndoToast({ message, onUndo, onTimeout })` with a 5 s timeout. Stage 5 reuses it.

- [ ] **Step 1: Write `e2e/history.spec.ts`.**
  - After viewing two products, History lists them newest first, each with its verdict.
  - Deleting one shows the toast "Removed · Undo". Clicking Undo restores it in place.
  - Tapping an item opens `/product/<code>`, and it renders with the OFF route aborted (offline from the cache).
  - The empty state appears when the history is empty.
  - `noHorizontalOverflow`.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Build with `/hallmark`.** Use a `FlatList` with a swipe-to-delete row on native and a visible delete button on web.
- [ ] **Step 4: Run to verify it passes, then commit.** `feat(app): history with undo`

---

### Task 15: Final verification (Stage 6)

- [ ] **Step 1: Run the static checks.** `npx tsc --noEmit && npm test`. Expected: 0 type errors, and all Jest suites pass.
- [ ] **Step 2: Run the e2e suite.** `npx playwright test`. Expected: every spec passes in both the `iphone-se` and `desktop` projects.
- [ ] **Step 3: Build for the web.** `npx expo export -p web`, then serve `dist` with an SPA fallback (`npx serve dist -s`) and open `/product/<example code>` directly. Expected: it renders, which proves deep links work.
- [ ] **Step 4: Check on real devices.**
  - In Expo Go on an iPhone and an Android phone:
    - scan one real Danish product
    - toggle the torch
    - feel the haptic
    - read one label with a real key
  - Record the results in the PR description.
- [ ] **Step 5: Check the contact constant.** Confirm `OFF_CONTACT` now holds the real repo URL.
