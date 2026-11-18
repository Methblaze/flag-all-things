import type { Flag, Rule } from '@/domain/types';
import { lookupAdditive } from '@/engine/data/additives';
import { findENumbers } from '@/engine/parse';

export const additivesRule: Rule = (p, prefs) => {
  const codes = [...new Set([...p.additives, ...(p.ingredientsText ? findENumbers(p.ingredientsText) : [])])];
  return codes.map((code): Flag => {
    const info = lookupAdditive(code);
    const label = 'E' + code.slice(1);
    const personal = prefs.additiveAlerts.includes(code) || (!!info && prefs.additiveAlerts.includes(info.code));
    const severity = personal ? 'danger' : info?.concern === 'high' ? 'warning' : 'info';
    if (!info) return { id: `additive:${code}`, category: 'additives', severity, title: label, detail: 'No notes on this additive yet.', personal };
    return {
      id: `additive:${code}`, category: 'additives', severity, personal,
      title: `${label} ${info.en}`,
      detail: `${info.da} (${info.group.replace('-', ' ')}). ${info.why}`,
      source: info.source,
    };
  });
};
