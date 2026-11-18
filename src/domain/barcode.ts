export type BarcodeCheck =
  | { ok: true; code: string; kind: 'product' | 'store-weighed' }
  | { ok: false; reason: 'empty' | 'not-digits' | 'length' | 'checksum' };

// GS1 mod-10: weights 3,1,3,… from the right, excluding the check digit.
function checkDigitOk(code: string): boolean {
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function checkBarcode(input: string): BarcodeCheck {
  let code = input.replace(/[\s-]/g, '');
  if (!code) return { ok: false, reason: 'empty' };
  if (!/^\d+$/.test(code)) return { ok: false, reason: 'not-digits' };
  if (![8, 12, 13].includes(code.length)) return { ok: false, reason: 'length' };
  if (code.length === 12) code = '0' + code; // UPC-A → EAN-13
  if (!checkDigitOk(code)) return { ok: false, reason: 'checksum' };
  // GS1 prefix 20–29: restricted circulation (in-store weighed goods), never in OFF.
  const kind = code.length === 13 && code[0] === '2' ? 'store-weighed' : 'product';
  return { ok: true, code, kind };
}

export type ScanGate = ((code: string, now: number) => boolean) & { rearm: (now: number) => void };

/** One pass per code per window. Call rearm() when the camera resumes, so a pack still in view
 *  after Back does not bounce straight to the product again (design doc §10). */
export function createScanGate(windowMs = 3000): ScanGate {
  let last: { code: string; at: number } | null = null;
  const gate = (code: string, now: number) => {
    if (last && last.code === code && now - last.at <= windowMs) return false;
    last = { code, at: now };
    return true;
  };
  return Object.assign(gate, { rearm: (now: number) => { if (last) last.at = now; } });
}
