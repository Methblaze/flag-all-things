import { Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { NotoSans_400Regular, NotoSans_600SemiBold } from '@expo-google-fonts/noto-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';
import { ToastProvider } from '@/components/Toast';
import { useTheme } from '@/theme/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const c = useTheme();
  const [loaded, error] = useFonts({ Figtree_600SemiBold, Figtree_700Bold, NotoSans_400Regular, NotoSans_600SemiBold });
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync().catch(() => {}); }, [loaded, error]);
  if (!loaded && !error) return null; // hold the splash until fonts are in (DESIGN.md §11)

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.canvas }}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.canvas } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="product/[barcode]" />
            <Stack.Screen name="label" />
          </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
