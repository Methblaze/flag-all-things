import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { DEFAULT_PREFS, type UserPreferences } from '@/domain/types';
import { loadPrefs, savePrefs } from '@/services/storage';

/** Optimistic: state changes at once; a failed save snaps back with a toast (interaction spec §1). */
export function usePrefs() {
  const [prefs, setState] = useState<UserPreferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const toast = useToast();

  // Reload on focus so a change in Settings reaches every screen.
  useFocusEffect(useCallback(() => {
    let live = true;
    loadPrefs().then(p => { if (live) { setState(p); setLoaded(true); } });
    return () => { live = false; };
  }, []));

  const latest = useRef(prefs);
  latest.current = prefs;
  const setPrefs = useCallback((next: UserPreferences) => {
    const prev = latest.current;
    latest.current = next;
    setState(next);
    savePrefs(next).catch(() => { latest.current = prev; setState(prev); toast({ message: "Couldn't save — try again" }); });
  }, [toast]);

  return { prefs, setPrefs, loaded };
}
