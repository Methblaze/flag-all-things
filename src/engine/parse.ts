import { ALLERGEN_KEYS, type AllergenKey } from '@/domain/types';
import { ADDITIVES } from '@/engine/data/additives';
import { ALLERGEN_FALSE_FRIENDS, ALLERGEN_WORDS, SUGAR_WORDS } from '@/engine/data/allergens';

const E_NUMBER = /\bE\s*-?\s*(\d{3,4}[a-f]?)(?!\d)/gi;
const TRACES = /(kan indeholde(?: spor af)?|may contain(?: traces of)?)([^.]*)/gi;

const byFirstIndex = <T,>(hits: Map<T, number>) => [...hits.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k);

export function findENumbers(text: string): string[] {
  const lower = text.toLowerCase();
  const hits = new Map<string, number>();
  const add = (code: string, at: number) => { if (!hits.has(code) || hits.get(code)! > at) hits.set(code, at); };
  for (const m of text.matchAll(E_NUMBER)) add('e' + m[1].toLowerCase(), m.index!);
  for (const a of Object.values(ADDITIVES)) {
    for (const term of a.match) {
      const at = lower.indexOf(term);
      if (at >= 0) add(a.code, at);
    }
  }
  return byFirstIndex(hits);
}

// Same-length blanking keeps match positions comparable across allergens.
const blank = (text: string, terms: string[] = []) =>
  terms.reduce((t, term) => t.split(term).join(' '.repeat(term.length)), text);

function firstIndex(text: string, word: string): number {
  if (word.length > 3) return text.indexOf(word);
  const m = new RegExp(`(?<![a-zæøå])${word}`).exec(text);
  return m ? m.index : -1;
}

function scan(text: string): AllergenKey[] {
  const hits = new Map<AllergenKey, number>();
  for (const key of ALLERGEN_KEYS) {
    const cleaned = blank(text, ALLERGEN_FALSE_FRIENDS[key]);
    const found = ALLERGEN_WORDS[key].map(w => firstIndex(cleaned, w)).filter(i => i >= 0);
    if (found.length) hits.set(key, Math.min(...found));
  }
  return byFirstIndex(hits);
}

export function findAllergens(text: string): { contains: AllergenKey[]; traces: AllergenKey[] } {
  const lower = text.toLowerCase();
  const traceParts = [...lower.matchAll(TRACES)].map(m => m[2]);
  return { contains: scan(lower.replace(TRACES, ' ')), traces: scan(traceParts.join(' , ')) };
}

function topLevelIngredients(text: string): string[] {
  const parts: string[] = [];
  let depth = 0, current = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; } else current += ch;
  }
  parts.push(current);
  return parts.map(p => p.trim()).filter(Boolean);
}

export function sugarIsMainIngredient(text: string): boolean {
  return topLevelIngredients(text.toLowerCase())
    .slice(0, 2)
    .map(p => p.replace(/\([^)]*\)|\[[^\]]*\]/g, ''))
    .some(p => SUGAR_WORDS.some(w => p.includes(w)));
}

export const mentionsPalmOil = (text: string) => /palme|palm/i.test(text);
