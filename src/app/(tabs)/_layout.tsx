import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { useTheme } from '@/theme/useTheme';

/** The system tab bar: Liquid Glass on iOS 26 (it shrinks as you scroll down), Material 3 on Android.
 *  The web keeps its own bar in _layout.web.tsx. */
export default function TabLayout() {
  const c = useTheme();
  // Lemon can't tint glass (it fails contrast on light), so iOS selects in pine and lets the filled symbol mark the tab.
  // Android's Material indicator is a solid pill, so it keeps the lemon highlight with ink on it.
  const android = Platform.OS === 'android'
    ? { indicatorColor: c.tertiary, iconColor: { default: c.onSecondary, selected: c.onTertiary } }
    : {};
  return (
    <NativeTabs tintColor={c.pineInk} minimizeBehavior="onScrollDown" {...android}>
      <NativeTabs.Trigger name="(scan)" testID="tab-scan">
        <NativeTabs.Trigger.Icon sf="barcode.viewfinder" md="barcode_scanner" />
        <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(history)" testID="tab-history">
        <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} md="history" />
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)" testID="tab-settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
