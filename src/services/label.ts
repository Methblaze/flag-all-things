import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

import { ALLERGEN_KEYS, type AllergenKey, type FlagReport, type Product, type UserPreferences } from '@/domain/types';
import { analyze } from '@/engine/analyze';
import { EXAMPLE_LABEL_PRODUCT } from '@/services/example-label';
import { getApiKey } from '@/services/storage';

export class LabelError extends Error {
  constructor(public code: 'unreadable' | 'bad-key' | 'network' | 'refused' | 'invalid-response') {
    super(code);
    this.name = 'LabelError';
  }
}

const allergen = z.enum(ALLERGEN_KEYS as [AllergenKey, ...AllergenKey[]]);
const num = z.number().nullable();
export const LabelSchema = z.object({
  readable: z.boolean(),
  name: z.string().nullable(),
  brand: z.string().nullable(),
  ingredients_text: z.string().nullable(),
  allergens: z.array(allergen),
  traces: z.array(allergen),
  nutrition: z.object({ energy_kcal: num, sugars: num, saturated_fat: num, salt: num, fiber: num, protein: num }),
  is_beverage: z.boolean(),
});

const SYSTEM = `You transcribe Danish or English food labels (varedeklaration). Transcribe exactly; do not judge, guess or infer.
- ingredients_text: the ingredient list as printed, including percentages and E-numbers.
- allergens: the ingredients printed in bold or capitals in the ingredient list, mapped to the given keys.
- traces: allergens after "kan indeholde (spor af)" or "may contain".
- nutrition: values per 100 g or 100 ml from the nutrition table.
- Use null for anything not legible. Set readable=false if the photo is not a food label.`;

type ParseClient = { beta: { messages: { parse: (params: never) => unknown } } };

export async function analyzeIngredientPhoto(
  base64Image: string,
  prefs: UserPreferences,
  opts: { barcode?: string | null; apiKey?: string | null; client?: ParseClient; now?: number } = {},
): Promise<{ product: Product; report: FlagReport }> {
  const now = opts.now ?? Date.now();
  const apiKey = 'apiKey' in opts ? opts.apiKey : await getApiKey();
  if (!apiKey) {
    const product = { ...EXAMPLE_LABEL_PRODUCT, fetchedAt: now };
    return { product, report: analyze(product, prefs) };
  }

  const client = (opts.client ?? new Anthropic({ apiKey, dangerouslyAllowBrowser: true })) as unknown as Anthropic;
  const data = base64Image.replace(/^data:[^,]+,/, '');
  let response;
  try {
    response = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: zodOutputFormat(LabelSchema) },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
          { type: 'text', text: 'Transcribe this food label.' },
        ],
      }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new LabelError('bad-key');
    if (e instanceof Anthropic.APIConnectionError) throw new LabelError('network');
    throw e;
  }

  if (response.stop_reason === 'refusal') throw new LabelError('refused');
  const out = response.parsed_output;
  if (response.stop_reason === 'max_tokens' || !out) throw new LabelError('invalid-response');
  if (!out.readable) throw new LabelError('unreadable');

  const n = out.nutrition;
  const product: Product = {
    barcode: opts.barcode ?? null,
    name: out.name ?? 'Unnamed product',
    brand: out.brand,
    imageUrl: null,
    ingredientsText: out.ingredients_text,
    additives: [], // the engine parses E-numbers from the text
    allergens: out.allergens,
    traces: out.traces,
    allergenDataKnown: out.ingredients_text !== null,
    nova: null,
    nutriscore: null,
    ecoscore: null,
    isBeverage: out.is_beverage,
    nutrition: { energyKcal: n.energy_kcal, sugars: n.sugars, saturatedFat: n.saturated_fat, salt: n.salt, fiber: n.fiber, protein: n.protein },
    diet: { vegan: null, vegetarian: null, palmOil: null },
    source: 'label-ai',
    fetchedAt: now,
  };
  return { product, report: analyze(product, prefs) };
}
