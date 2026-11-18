import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/Toast';
import type { Product } from '@/domain/types';
import { analyze } from '@/engine/analyze';
import { fetchProduct } from '@/services/off';
import { findCached, isStale, loadPrefs, saveScan } from '@/services/storage';

export type ProductStatus = 'loading' | 'ready' | 'not-found' | 'busy' | 'offline';

/** Cache first, then revalidate in the background (stale-while-revalidate). */
export function useProduct(barcode: string) {
  const toast = useToast();
  const [status, setStatus] = useState<ProductStatus>('loading');
  const [product, setProduct] = useState<Product | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState<'busy' | 'offline' | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const cached = await findCached(barcode);
      if (!live) return;
      if (cached) {
        setProduct(cached); setStatus('ready');
        if (!isStale(cached, Date.now())) return;
        setRefreshing(true);
      } else {
        setProduct(null); setStatus('loading');
      }

      const result = await fetchProduct(barcode);
      if (result.kind === 'found') {
        // Saved even if the user already left the screen (interaction spec E10).
        const verdict = analyze(result.product, await loadPrefs()).verdict;
        saveScan(result.product, verdict).catch(() => toast({ message: "Couldn't save to History" }));
      }
      if (!live) return;
      setRefreshing(false);
      if (result.kind === 'found') { setProduct(result.product); setStatus('ready'); setRefreshFailed(null); }
      else if (cached) setRefreshFailed(result.kind === 'not-found' ? null : result.kind);
      else setStatus(result.kind);
    })();
    return () => { live = false; };
  }, [barcode, attempt, toast]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  return { status, product, refreshing, refreshFailed, retry };
}
