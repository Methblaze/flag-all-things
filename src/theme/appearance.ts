import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

/** The user's Appearance choice in Settings: follow the system, or force light or dark. */
export type AppearanceChoice = 'system' | 'light' | 'dark';

const KEY = 'fat:appearance:v1';
let choice: AppearanceChoice = 'system';
const listeners = new Set<() => void>();

function apply(next: AppearanceChoice) {
  choice = next;
  if (Platform.OS === 'web') {
    // global.css reads data-theme; without it the page follows prefers-color-scheme.
    if (typeof document !== 'undefined') {
      if (next === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = next;
    }
  } else {
    // Native override, so the system tab bar, headers, status bar, keyboard and dynamic colours follow too.
    Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
  }
  listeners.forEach(l => l());
}

/** Read the saved choice once at launch (the root layout holds the splash until this settles, so no wrong-theme flash). */
export function loadAppearance(): Promise<void> {
  return AsyncStorage.getItem(KEY).then(v => { if (v === 'light' || v === 'dark') apply(v); }, () => {});
}

/** Applies at once; a failed save only means the next launch follows the system again, so it stays silent. */
export function setAppearance(next: AppearanceChoice) {
  apply(next);
  AsyncStorage.setItem(KEY, next).catch(() => {});
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useAppearanceChoice = () => useSyncExternalStore(subscribe, () => choice, () => choice);

/** The scheme the app should draw: the user's choice, or the system's when they chose "System". */
export function useScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const picked = useAppearanceChoice();
  return picked === 'system' ? (system === 'dark' ? 'dark' : 'light') : picked;
}
