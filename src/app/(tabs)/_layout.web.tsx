import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { LayoutAnimationConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { popIn } from '@/components/Button';
import { radius, type } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type IconName = ComponentProps<typeof Feather>['name'];
const POP_PILL = popIn(0.6);

/** Web only: native tabs on the web are a text-only pill pinned over the content, so the browser keeps this bar.
 *  The active tab sits on a lemon pill: the app's one recurring highlight (DESIGN.md §2.1b). */
function TabIcon({ name, focused, color }: { name: IconName; focused: boolean; color: unknown }) {
  const c = useTheme();
  // The pill grows in when its tab becomes active, so the highlight lands where you tapped. The first paint stays at rest.
  return (
    <LayoutAnimationConfig skipEntering>
      <View style={styles.pill}>
        {focused ? <Animated.View entering={POP_PILL} style={[StyleSheet.absoluteFill, styles.pillFill, { backgroundColor: c.tertiary }]} /> : null}
        <Feather name={name} size={20} color={focused ? c.onTertiary : (color as string)} />
      </View>
    </LayoutAnimationConfig>
  );
}

const tab = (name: IconName) => ({ focused, color }: { focused: boolean; color: unknown }) => <TabIcon name={name} focused={focused} color={color} />;

export default function TabLayout() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { maxFontSizeMultiplier: _m, ...label } = type.tag;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.onSecondary,
        // Default 49pt bar clips 13pt labels: item padding (10) + icon box (28) + label (16) needs 60pt.
        tabBarStyle: { backgroundColor: c.secondary, borderTopColor: c.border, borderTopWidth: 1, height: 60 + insets.bottom, paddingTop: 0, paddingBottom: insets.bottom },
        tabBarLabelStyle: label,
        sceneStyle: { backgroundColor: c.canvas },
      }}
    >
      <Tabs.Screen name="(scan)" options={{ title: 'Scan', tabBarIcon: tab('maximize'), tabBarButtonTestID: 'tab-scan' }} />
      <Tabs.Screen name="(history)" options={{ title: 'History', tabBarIcon: tab('clock'), tabBarButtonTestID: 'tab-history' }} />
      <Tabs.Screen name="(settings)" options={{ title: 'Settings', tabBarIcon: tab('sliders'), tabBarButtonTestID: 'tab-settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { width: 48, height: 28, alignItems: 'center', justifyContent: 'center' },
  pillFill: { borderRadius: radius.pill },
});
