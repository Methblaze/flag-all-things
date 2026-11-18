# Flag All Things: Design

Date: 2026-11-18 · Status: draft for approval · Stage 1 of 6

## 1. Intent and why

This is a barcode and ingredient-label scanner for Danish supermarkets (Netto, Rema 1000, Føtex, Lidl and others). It turns a product into one quick verdict, then gives the reasons behind it.

It has two audiences, and both are real:

1. **The owner, shopping.** It has to be fast in the aisle, readable at a glance, work offline for products already scanned, and use their own alert settings. It has to be good enough to actually use.
2. **A portfolio visitor**, usually a recruiter or designer on a desktop browser. They need to see the whole flow without a phone, without the owner's API key and without a Danish product in hand. The case-study story is *explainable flags*: every flag says why it was raised and cites a source.

## 2. Goals

- Scan EAN-13 and EAN-8, and accept 12-digit UPC-A by padding it to 13 digits with a leading zero. Show a verdict that can be read in about two seconds.
- Provide manual barcode entry, a torch toggle where the platform supports one, and check-digit validation.
- Look products up in Open Food Facts (OFF), and cache each result locally so history works offline.
- Run one rules engine that produces flags in five sections: **Processing** (NOVA), **Additives** (E-numbers), **Nutrition**, **Allergens & traces**, and **Diet & ethics** (vegan, vegetarian, palm oil, Eco-Score).
- Show a summary card first, then sections that expand.
- When a product is missing, offer a label-photo fallback. The AI transcribes the Danish *varedeklaration* into the same `Product` shape, and the same engine scores it.
- Bottom tabs: **Scan**, **History**, **Settings**.
- Settings: an allergen alert list, specific E-number alerts, a NOVA threshold, a diet rule, palm-oil avoidance, and the Anthropic API key.
- No text clipping at 375×667 (iPhone SE). Scale cleanly up to a desktop browser.
- Portfolio mode: example barcodes on the web Scan screen, and shareable result URLs (`/product/5701234567890`).

## 3. Non-goals (v1)

- Accounts, sync and any backend of our own.
- Adding or editing products on Open Food Facts.
- A Danish UI translation. The UI is in English, while product names, ingredients and Danish additive names are shown as printed.
- On-device OCR.
- Shopping lists, price comparison and recommending alternatives.
- Medical or dietary advice. The app reports what the label says and what the cited sources say.

## 4. Anti-goals (failure even if it "works")

- **A flag with no reason.** Every flag carries a plain-language explanation, and additive and nutrition flags also carry a source.
- **Saying "no allergens" when the data is missing.** Missing allergen data is shown as *unknown — check the pack*, never as clear.
- **Everything is red.** Red is reserved for "this conflicts with *your* settings". General concerns are amber at most. If every product looks alarming, the app is useless in a shop.
- **The API key leaving the device**, except in the request header sent to `api.anthropic.com`.
- **Getting rate-limited or banned by OFF.** The limit is 15 product reads per minute per user.
- **Non-deterministic verdicts.** The same `Product` with the same preferences always gives the same report.

## 5. Constraints

- **Stack:** Expo SDK 58, Expo Router, TypeScript. Only modules included in Expo Go, with no custom native code: `expo-camera`, `expo-haptics`, `expo-image-picker`, `expo-image-manipulator`, `expo-secure-store`, `@react-native-async-storage/async-storage`, `react-native-reanimated` and `react-native-gesture-handler`.
- **expo-camera (SDK 58)** supports `barcodeScannerSettings`, `onBarcodeScanned` and `enableTorch` on Android, iOS and the web. On the web, browser support varies: iOS Safari has no torch, and some browsers or insecure contexts have no camera at all. The UI has to cope when either is missing.
- **Open Food Facts:**
  - **Primary:** API v3, `GET https://world.openfoodfacts.org/api/v3/product/{code}` with a `fields=` list to keep the payload small.
  - **Fallback:** the deprecated v2 endpoint, `GET https://world.openfoodfacts.org/api/v2/product/{code}.json`. It is used only after a network error or a 5xx response from v3, never after "not found".
  - **Identification:** native builds send `User-Agent: FlagAllThings/<version> (<contact>)`. `<contact>` is the project's repo or portfolio URL, never a personal email. It lives in one constant in `services/off.ts` and is filled in once the repo exists. Browsers forbid setting `User-Agent`, so the web build adds `app_name=FlagAllThings&app_version=<version>` as query parameters instead.
  - **Rate limit:** 15 reads per minute per user. If OFF returns 429 or 503, show a "busy, try again in a minute" state and don't retry automatically in a loop.
- **Anthropic:** the app calls `https://api.anthropic.com/v1/messages` directly from the client using the user's own key. On the web this needs the `anthropic-dangerous-direct-browser-access: true` header. The key is stored with `expo-secure-store` on native and in `localStorage` on the web (that browser only), and is never part of the app bundle.
- **Storage:** AsyncStorage, which uses `localStorage` on the web and is limited to about 5 MB.

## 6. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A, chosen** | **One engine, two sources.** OFF lookups and AI label reads both normalise to `Product`. A pure function `analyze(product, prefs)` produces the report. The AI only transcribes. | Scanned and photographed products get identical verdicts that can be unit-tested. The verdicts rest on a cited, curated additive list. It needs more engine code: OFF's tags are used first, with a fallback to parsing the ingredient text. |
| B | The AI judges label photos directly and returns flags. | Less code, but the same product could get different verdicts depending on how it was looked up. Those verdicts can't be tested, and the AI's opinion replaces the cited list. |
| C | Use OFF's computed tags only, with no text parsing. | The least code, but it fails on partial Danish store-brand data and on every label photo. |

The owner picked **A**. For the AI key, they picked **paste the key in Settings**. Without a key, the label flow returns a clearly labelled *example* result so portfolio visitors still see the whole path. A proxy server and an always-example mode were also considered and rejected.

State is **plain React hooks over AsyncStorage**. There is no state or query library: the app has three tabs and one fetch.

## 7. Architecture

```
app/                         Expo Router
  (tabs)/_layout.tsx         Scan · History · Settings
  (tabs)/index.tsx           Scan
  (tabs)/history.tsx
  (tabs)/settings.tsx
  product/[barcode].tsx      Result (deep-linkable on web)
  label.tsx                  Label-photo fallback (accepts ?barcode=)
src/
  domain/types.ts            Product, Flag, FlagReport, UserPreferences, ScanHistoryItem
  domain/barcode.ts          normalize + validate (GS1 check digit, prefix classes)
  engine/analyze.ts          analyze(product, prefs) → FlagReport  (composes rules)
  engine/rules/{processing,additives,nutrition,allergens,diet}.ts   each (product, prefs) → Flag[]
  engine/data/additives.ts   curated E-number table with sources
  engine/data/allergens.ts   EU-14 allergens + Danish/English ingredient words
  engine/parse.ts            ingredient-text helpers (E-numbers, allergen words, sugar position)
  services/off.ts            fetchProduct(code) → Product | NotFound  (v3 → v2 fallback, normalise)
  services/label.ts          analyzeIngredientPhoto(base64Image, prefs) → { product, report }
  services/storage.ts        history (doubles as product cache), prefs, API key
  hooks/useProduct.ts        cache-first, revalidate in background
```

Rules are pure functions with no I/O, which makes the engine fully testable with fixtures. `analyze` concatenates the rules' flags, sorts them by severity, derives the verdict and records which sections had no data.

## 8. Data models

```ts
type AllergenKey = 'gluten'|'crustaceans'|'eggs'|'fish'|'peanuts'|'soy'|'milk'|'nuts'
  |'celery'|'mustard'|'sesame'|'sulphites'|'lupin'|'molluscs';           // EU 14
type Grade = 'a'|'b'|'c'|'d'|'e';
type ProductSource = 'off' | 'label-ai' | 'example';

interface Product {
  barcode: string | null;            // null for a label read with no barcode
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  ingredientsText: string | null;    // prefer Danish, then English, then any
  additives: string[];               // normalised 'e250', 'e160a' — from tags ∪ parsed text
  allergens: AllergenKey[];
  traces: AllergenKey[];
  allergenDataKnown: boolean;        // false → "unknown", never "none"
  nova: 1 | 2 | 3 | 4 | null;
  nutriscore: Grade | null;
  ecoscore: Grade | null;            // OFF: environmental_score_grade, fallback ecoscore_grade
  isBeverage: boolean;               // switches nutrition thresholds to per-100 ml
  nutrition: {                       // per 100 g / 100 ml, null = not on record
    energyKcal: number | null; sugars: number | null; saturatedFat: number | null;
    salt: number | null; fiber: number | null; protein: number | null;
  };
  diet: { vegan: boolean | null; vegetarian: boolean | null; palmOil: boolean | null };
  source: ProductSource;
  fetchedAt: number;                 // epoch ms
}

type Severity = 'danger' | 'warning' | 'info' | 'good';
type FlagCategory = 'processing' | 'additives' | 'nutrition' | 'allergens' | 'diet';

interface Flag {
  id: string;                        // stable, e.g. 'additive:e250', 'nutrition:salt-high'
  category: FlagCategory;
  severity: Severity;
  title: string;                     // "High in salt"
  detail: string;                    // "2.1 g per 100 g — above the 1.5 g 'high' level."
  source?: { label: string; url: string };
  personal: boolean;                 // true when raised/escalated by the user's preferences
}

type Verdict = 'avoid' | 'caution' | 'ok' | 'good' | 'unknown';

interface FlagReport {
  verdict: Verdict;
  headline: string;                  // the single most important reason, ≤ 60 chars
  counts: Record<Severity, number>;
  flags: Flag[];                     // sorted: danger, warning, info, good
  missing: FlagCategory[];           // sections with no data → shown as "Not on record"
}

interface UserPreferences {
  allergens: AllergenKey[];          // default []
  additiveAlerts: string[];          // specific E-numbers, default []
  novaAlert: 3 | 4 | null;           // escalate NOVA ≥ this to danger; default null (off)
  diet: 'none' | 'vegetarian' | 'vegan';   // default 'none'
  avoidPalmOil: boolean;             // default false
}
// API key is stored separately (secure store / localStorage), never inside UserPreferences.

interface ScanHistoryItem {
  id: string;                        // barcode, or 'label:<timestamp>' when none
  product: Product;                  // full product → history doubles as the offline cache
  verdict: Verdict;                  // stored for the list; recomputed when opened
  scannedAt: number;
}
```

## 9. Rules engine

**Severity policy:** `danger` = conflicts with the user's preferences (`personal: true`). `warning` = a general concern backed by a source. `info` = neutral fact. `good` = a positive signal.

**Verdict:** `unknown` if there are no ingredients and no nutrition data. Otherwise `avoid` if there is any danger flag, `caution` if there is any warning, `good` if there are no warnings and at least one good flag, and `ok` otherwise.

**Headline:** taken from the top flag, e.g. "Contains milk — on your alert list" or "Ultra-processed · 3 additives of concern".

| Rule | Logic |
|---|---|
| Processing | NOVA 4 → warning. NOVA 3 → info. NOVA 1–2 → good. If `novaAlert` is set, any NOVA ≥ `novaAlert` → danger. Null → section missing. |
| Additives | `additives` is OFF's `additives_tags` merged with E-numbers regex-parsed from the ingredient text. The regex is tolerant: `E 250`, `e-250`, `E250a`, line breaks, and Danish additive names mapped to E-numbers. Each one is looked up in `data/additives.ts`, which holds the English and Danish name, group, concern level, a one-sentence reason and a source. High concern → warning, low or none → info, and an E-number missing from the table → info ("no notes"). Anything in `additiveAlerts` → danger. |
| Nutrition | "High" levels per 100 g follow the UK FSA front-of-pack criteria: sugars > 22.5 g, saturated fat > 5 g, salt > 1.5 g. Drinks use per 100 ml: sugars > 11.25, saturated fat > 2.5, salt > 0.75. Each high level → warning. Nutri-Score D/E → warning and A/B → good. Fibre < 3 g (below the EU "source of fibre" claim) → info. Sugar named in the first two ingredients (`sukker`, `glukosesirup`, `sugar`, …) → warning "sugar is a main ingredient". The app says "sugars", not "added sugar", unless the ingredient-position rule fired. |
| Allergens | Data comes from OFF's `allergens_tags` / `traces_tags`, merged with Danish and English words parsed from the text (`hvede`, `rug`, `byg`, `havre`, `spelt` → gluten; `mælk`, `fløde`, `valle` → milk; `kan indeholde spor af …` → traces). For an allergen on the user's list: contains → danger, traces → warning. Other allergens → info. If `allergenDataKnown` is false and the user's list is not empty → warning "Allergen info missing — check the pack". |
| Diet & ethics | Uses OFF's `ingredients_analysis_tags` and `labels_tags`. If the product conflicts with the chosen diet → danger, and an unknown status under a diet → warning. Palm oil → danger if `avoidPalmOil`, otherwise info. Eco-Score A/B → good, D/E → info. |

**Barcode classes (`domain/barcode.ts`):**

| Class | What happens |
|---|---|
| Valid | Strip spaces and dashes, accept 8, 12 or 13 digits, then verify the GS1 check digit. A failed check gives an inline error. |
| In-store weighed goods (prefix `2`, e.g. deli, meat, bakery) | Never in OFF. Show "This is a store's own price label — scan the ingredient label instead" and skip the lookup. |
| 570–579 (GS1 Denmark) | No special handling. These are used as test fixtures. |

## 10. Flows (high level; Stage 2 details states)

1. **Scan.**
   - The camera locks on a code, scanning pauses and a haptic fires (native).
   - The barcode is validated. On a cache hit, the result shows instantly and refreshes in the background if older than 24 h. On a miss, the app fetches the product while a skeleton shows.
   - Hit → `/product/[barcode]`. The same code is ignored for 3 s after the camera resumes.
2. **Not found.**
   - The result screen shows "Not in Open Food Facts yet", with **Scan ingredient label** as the primary action and "Enter a different barcode" as the secondary.
   - The label path carries the barcode along, so a re-scan later hits the local cache.
3. **Label photo.**
   - `expo-image-picker` uses the camera on native, and a file or camera picker on the web (good for desktop visitors).
   - The image is resized to about 1568 px on the long edge and sent as JPEG base64.
   - With a key: the photo goes to Claude for structured extraction. The response is validated at the trust boundary, with malformed output turned into a retryable error, and then passed to `analyze`.
   - Without a key: a bundled example `Product` with `source: 'example'` and a banner "Example result — add your key in Settings to read real labels".
4. **History.**
   - Newest first, with verdict dot, name and time. Tap to open the cached product, which works offline.
   - Swipe or press to delete, with an undo toast.
   - Capped at 200 items, oldest dropped.
5. **Settings.** Preferences save immediately (optimistic). Changing preferences re-scores products on open, because the verdict is always recomputed.

**Edge cases to cover:**
- Camera permission denied: manual entry becomes primary, with a link to system settings on native.
- No camera, or an insecure context on the web: manual entry plus example barcodes.
- Offline and uncached: say so plainly, with a retry.
- OFF returns 429 or 503.
- The product has a name but no ingredients.
- The label photo is blurry or not a label: the AI returns "unreadable", shown as a retryable error.
- The key is invalid (401): an error that links to Settings.

## 11. Portfolio mode

- On the web Scan screen, an "Try a Danish example" row offers 3–4 real Danish barcodes chosen to give different verdicts, for example a rye bread, a soft drink, a candy and a skyr. These are also shown when no camera is available on native.
- Their OFF payloads are saved as test fixtures, so the examples and the tests share data.

## 12. Testing

- **Jest (`jest-expo`)**, test-driven:
  - every rule on Danish fixtures (real OFF JSON for 570/571 products, plus hand-made partial payloads)
  - `parse.ts` on messy strings (OCR line breaks, `E 250`, uppercase Danish, trailing "kan indeholde spor af")
  - barcode validation
  - the OFF normaliser for both v3 and v2 shapes
  - the label-response validator
- **Playwright on the Expo Web build** at 375×667 and at desktop width:
  - scan screen without a camera → manual entry → example product → result → expand section → history → settings toggle re-scores
  - no horizontal overflow and no clipped text

## 13. Later stages

- **Stage 2 (Interaction Design):** full flows, edge cases and component states.
- **Stage 3 (UI/UX Pro Max):** `DESIGN.md` with tokens, including the semantic severity colours danger, warning, info and good.
- **Stage 4 (Hallmark):** screens.
- **Stage 5:** motion and haptics.
- **Stage 6:** Playwright, review and ship.

This document does not set any visual design.

## 14. Calls made during design (owner to check)

- **Red means personal.** Only conflicts with the user's settings are `danger`. General concerns, including high-concern additives and NOVA 4, are `warning`.
- **A verdict tier plus severity counts, with no 0–100 score.** A single number would suggest more precision than the data supports.
- **"Sugars", not "added sugar".** OFF rarely separates the two, so the app only says "sugar is a main ingredient" when the ingredient order shows it.
- **History is the cache.** It is capped at 200 items, and the verdict is recomputed whenever a product is opened.
- **Web build:** `web.output: "single"` (SPA), so `/product/[barcode]` deep links work on static hosting with a rewrite to `index.html`. Hosting is chosen at Stage 6.
- **Example barcodes** appear on the web Scan screen, and on native only when there is no camera, which keeps the shop flow clean.
- **Label photos use `expo-image-picker`,** not a custom camera screen. It gives desktop visitors a file picker for free.

## 15. Left to the builder

- Mapping OFF's v3 and v2 responses to `Product`, verified against live responses.
- Drafting the additive table (about 60 entries, each with a source: EFSA opinions, EU Reg. 1333/2008 Annex V for the "Southampton" colours, etc.). The owner reviews it before ship.
- The Danish/English allergen word list and the sugar-synonym list.
- The extraction prompt, the JSON schema, the model choice and the image-size tuning for the label service.
- Choosing and verifying the example barcodes.
