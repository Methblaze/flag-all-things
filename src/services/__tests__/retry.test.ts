import type { ToastSpec } from '@/components/Toast';
import { saveWithRetry } from '@/services/retry';

const flush = () => new Promise(r => setImmediate(r));

test('a failed save toasts Retry; Retry runs it again and stays quiet on success', async () => {
  const toasts: ToastSpec[] = [];
  const run = jest.fn().mockRejectedValueOnce(new Error('quota')).mockResolvedValueOnce(undefined);
  saveWithRetry(t => toasts.push(t), "Couldn't save to History", run);
  await flush();
  expect(toasts).toHaveLength(1);
  expect(toasts[0]).toMatchObject({ message: "Couldn't save to History", actionLabel: 'Retry' });
  toasts[0].onAction!();
  await flush();
  expect(run).toHaveBeenCalledTimes(2);
  expect(toasts).toHaveLength(1);
});

test('a second failure offers Retry again', async () => {
  const toasts: ToastSpec[] = [];
  saveWithRetry(t => toasts.push(t), 'x', () => Promise.reject(new Error('still down')));
  await flush(); toasts[0].onAction!(); await flush();
  expect(toasts).toHaveLength(2);
});
