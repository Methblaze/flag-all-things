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

test('rearm restarts the window when the camera resumes (no bounce back to the product)', () => {
  const gate = createScanGate(3000);
  expect(gate('5701234567899', 0)).toBe(true);
  gate.rearm(10_000); // user returns to Scan 10 s later with the pack still in view
  expect(gate('5701234567899', 10_500)).toBe(false);
  expect(gate('5701234567899', 13_001)).toBe(true);
});
