import type { ToastSpec } from '@/components/Toast';

/** Runs a save; if it fails, the toast offers Retry, which runs it again (and offers again if that fails too). */
export function saveWithRetry(toast: (t: ToastSpec) => void, message: string, run: () => Promise<unknown>) {
  const attempt = () => { run().catch(() => toast({ message, actionLabel: 'Retry', onAction: attempt })); };
  attempt();
}
