import Anthropic from '@anthropic-ai/sdk';

import { DEFAULT_PREFS } from '@/domain/types';
import { analyze } from '@/engine/analyze';
import { analyzeIngredientPhoto } from '@/services/label';

const ok = { stop_reason: 'end_turn', parsed_output: { readable: true, name: 'Rugbrød', brand: null, ingredients_text: 'Rugmel, vand, salt', allergens: ['gluten'], traces: [], nutrition: { energy_kcal: 210, sugars: 1, saturated_fat: 0.3, salt: 1.1, fiber: 7, protein: 6 }, is_beverage: false } };
const client = (impl: () => unknown) => ({ beta: { messages: { parse: jest.fn(impl) } } });

test('no key → example product, no API call', async () => {
  const c = client(() => ok);
  const r = await analyzeIngredientPhoto('AAAA', DEFAULT_PREFS, { apiKey: null, client: c });
  expect(r.product.source).toBe('example'); expect(c.beta.messages.parse).not.toHaveBeenCalled();
});
test('with key → label-ai product scored by the engine', async () => {
  const c = client(() => ok);
  const r = await analyzeIngredientPhoto('AAAA', DEFAULT_PREFS, { apiKey: 'k', client: c, barcode: '5701234567899', now: 5 });
  expect(r.product).toMatchObject({ source: 'label-ai', barcode: '5701234567899', allergens: ['gluten'], allergenDataKnown: true, fetchedAt: 5, nutrition: expect.objectContaining({ fiber: 7 }) });
  expect(r.report).toEqual(analyze(r.product, DEFAULT_PREFS));
});
test('request shape', async () => {
  const c = client(() => ok);
  await analyzeIngredientPhoto('data:image/jpeg;base64,AAAA', DEFAULT_PREFS, { apiKey: 'k', client: c });
  const req = (c.beta.messages.parse.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
  expect(req).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'], output_config: expect.objectContaining({ effort: 'low' }) });
  expect(JSON.stringify(req.messages)).toContain('"data":"AAAA"'); expect(JSON.stringify(req.messages)).toContain('"media_type":"image/jpeg"');
});
test.each([
  [{ ...ok, parsed_output: { ...ok.parsed_output, readable: false } }, 'unreadable'],
  [{ stop_reason: 'refusal', parsed_output: null }, 'refused'],
  [{ stop_reason: 'max_tokens', parsed_output: null }, 'invalid-response'],
  [{ stop_reason: 'end_turn', parsed_output: null }, 'invalid-response'],
])('%#: bad responses → LabelError', async (resp, code) =>
  await expect(analyzeIngredientPhoto('AAAA', DEFAULT_PREFS, { apiKey: 'k', client: client(() => resp) })).rejects.toMatchObject({ code }));
test('401 → bad-key; connection error → network', async () => {
  await expect(analyzeIngredientPhoto('A', DEFAULT_PREFS, { apiKey: 'k', client: client(() => { throw new Anthropic.AuthenticationError(401, undefined, 'x', new Headers()); }) })).rejects.toMatchObject({ code: 'bad-key' });
  await expect(analyzeIngredientPhoto('A', DEFAULT_PREFS, { apiKey: 'k', client: client(() => { throw new Anthropic.APIConnectionError({ message: 'x' }); }) })).rejects.toMatchObject({ code: 'network' });
});
test('other errors are not swallowed', async () =>
  await expect(analyzeIngredientPhoto('A', DEFAULT_PREFS, { apiKey: 'k', client: client(() => { throw new Error('boom'); }) })).rejects.toThrow('boom'));
