import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { AppText } from '@/components/primitives';
import { fonts, layout, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Shared options for every native stack header (DESIGN.md §4.1). */
export function useHeaderOptions() {
  const c = useTheme();
  return {
    contentStyle: { backgroundColor: c.canvas },
    headerTintColor: c.ink,
    headerTitleStyle: { fontFamily: fonts.headingSemi, color: c.ink },
    headerLargeTitleStyle: { fontFamily: fonts.heading, color: c.ink },
    headerShadowVisible: false,
    // A chevron only; long-press still opens the system back-history menu.
    headerBackButtonDisplayMode: 'minimal' as const,
    // iOS 26 draws its glass bar and scroll-edge effect only when no header background is set; Android and web get the canvas.
    headerStyle: Platform.OS === 'ios' ? undefined : { backgroundColor: c.canvas },
  };
}

/** One tab's own native stack, so its title is a large title that collapses into the bar on scroll. */
export function TabStack({ title, large = true }: { title: string; large?: boolean }) {
  return <Stack screenOptions={{ ...useHeaderOptions(), title, headerLargeTitleEnabled: large }} />;
}

/** Scan's inline title: the brand mark with the app name. */
export function BrandTitle() {
  return (
    <View style={styles.brand}>
      <BrandMark size={28} />
      <AppText variant="headline">Flag All Things</AppText>
    </View>
  );
}

/** Put in a pushed screen: the system back button when there is history; a deep link opened cold gets "Scan" in its
 *  place instead of an empty slot (interaction spec F8). Escape goes back on desktop web, as the old in-page Back did. */
export function BackFallback() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.target instanceof HTMLInputElement) return;
      if (router.canGoBack()) router.back(); else router.replace('/');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  // Read after mount: during the push's first render the history isn't committed yet, so both canGoBack()s read false.
  const [canGoBack, setCanGoBack] = useState(true);
  useEffect(() => setCanGoBack(router.canGoBack()), []);
  return <Stack.Screen options={{ headerLeft: canGoBack ? undefined : () => <HomeButton /> }} />;
}

function HomeButton() {
  return (
    <Pressable testID="home-button" accessibilityRole="button" onPress={() => router.replace('/')} hitSlop={space.s2} style={styles.home}>
      <AppText variant="bodyStrong">Scan</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  home: { minHeight: layout.target, justifyContent: 'center', paddingHorizontal: space.s2 },
});
