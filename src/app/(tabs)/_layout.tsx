import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { type } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const tab = (name: ComponentProps<typeof Feather>['name']) =>
  ({ color, size }: { color: unknown; size: number }) => <Feather name={name} color={color as string} size={size} />;

export default function TabLayout() {
  const c = useTheme();
  const { maxFontSizeMultiplier: _m, lineHeight: _l, ...label } = type.tag;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, borderTopWidth: 1 },
        tabBarLabelStyle: label,
        sceneStyle: { backgroundColor: c.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Scan', tabBarIcon: tab('maximize'), tabBarButtonTestID: 'tab-scan' }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: tab('clock'), tabBarButtonTestID: 'tab-history' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tab('sliders'), tabBarButtonTestID: 'tab-settings' }} />
    </Tabs>
  );
}
