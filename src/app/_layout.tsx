import { Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { NotoSans_400Regular, NotoSans_600SemiBold } from '@expo-google-fonts/noto-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { getFocusedRouteNameFromRoute } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';
import { useHeaderOptions } from '@/components/header';
import { ToastProvider } from '@/components/Toast';
import { loadAppearance } from '@/theme/appearance';
import { useTheme } from '@/theme/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const TAB_TITLES: Record<string, string> = { '(scan)': 'Scan', '(history)': 'History', '(settings)': 'Settings' };

export default function RootLayout() {
  const c = useTheme();
  const header = useHeaderOptions();
  const [loaded, error] = useFonts({ Figtree_600SemiBold, Figtree_700Bold, NotoSans_400Regular, NotoSans_600SemiBold });
  const [themed, setThemed] = useState(false);
  useEffect(() => { loadAppearance().finally(() => setThemed(true)); }, []);
  const ready = (loaded || !!error) && themed;
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null; // hold the splash until fonts and the saved Appearance are in (DESIGN.md §11)

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.canvas }}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={header}>
            {/* Titles also label the long-press back menu, so the tabs entry is named after the tab you came from. */}
            <Stack.Screen name="(tabs)" options={({ route }) => ({ headerShown: false, title: TAB_TITLES[getFocusedRouteNameFromRoute(route) ?? '(scan)'] ?? 'Scan' })} />
            <Stack.Screen name="product/[barcode]" options={{ title: 'Product' }} />
            <Stack.Screen name="label" options={{ title: 'Scan ingredient label' }} />
          </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
