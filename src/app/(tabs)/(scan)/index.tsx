import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';

import { Button, usePressScale } from '@/components/Button';
import { BrandTitle } from '@/components/header';
import { Icon } from '@/components/Icon';
import { AppText, Screen } from '@/components/primitives';
import { Banner } from '@/components/severity';
import { TextField } from '@/components/TextField';
import { checkBarcode, createScanGate, type BarcodeCheck } from '@/domain/barcode';
import { EXAMPLE_BARCODES } from '@/services/off';
import { layout, motion, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const ERRORS: Record<Extract<BarcodeCheck, { ok: false }>['reason'], string> = {
  empty: 'Enter a barcode',
  checksum: "That barcode doesn't add up. Check the last digit.",
  length: 'Barcodes are 8, 12 or 13 digits',
  'not-digits': 'Use digits only',
};
const isWeb = Platform.OS === 'web';
const LOCK_MS = 160;

export default function ScanScreen() {
  const c = useTheme();
  const [focused, setFocused] = useState(true);
  const gate = useMemo(() => createScanGate(), []);
  const lock = useSharedValue(0); // 0 aiming, 1 locked onto a code
  // Restart the gate window when the camera resumes, so a pack still in view after Back does not bounce (design §10).
  useFocusEffect(useCallback(() => { setFocused(true); lock.value = 0; gate.rearm(Date.now()); return () => setFocused(false); }, [gate, lock]));
  const { height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(isWeb ? null : true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [torch, setTorch] = useState(false);
  const [weighed, setWeighed] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const field = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => { if (isWeb) CameraView.isAvailableAsync().then(setCameraAvailable).catch(() => setCameraAvailable(false)); }, []);
  // Pause the camera in the background; resume on return (interaction spec E17).
  useEffect(() => { const sub = AppState.addEventListener('change', s => { setActive(s === 'active'); if (s === 'active') gate.rearm(Date.now()); }); return () => sub.remove(); }, []);
  // "/" focuses the barcode field on desktop web.
  useEffect(() => {
    if (!isWeb) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === '/' && !typing) { e.preventDefault(); field.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (code: string) => { setWeighed(false); router.push({ pathname: '/product/[barcode]', params: { barcode: code } }); };

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (!gate(data, Date.now())) return;
    const check = checkBarcode(data);
    if (!check.ok) return; // camera misreads are ignored silently (E9)
    if (check.kind === 'store-weighed') return setWeighed(true);
    if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Lock-on: the lemon corners snap in and the frame flashes, then the result opens, so the scan visibly lands first.
    lock.value = withTiming(1, { duration: LOCK_MS, easing: motion.ease.out });
    setTimeout(() => go(check.code), reduced ? 0 : LOCK_MS);
  };

  // A failed submit is the one moment that must register: shake the field, buzz, keep focus there.
  const reduced = useReducedMotion();
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const shake = () => {
    if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    field.current?.focus();
    if (reduced) return;
    shakeX.value = withSequence(...motion.shake.map(x => withTiming(x, { duration: 60, easing: motion.ease.inOut })));
  };

  const submit = () => {
    const check = checkBarcode(input);
    if (!check.ok) { shake(); return setError(ERRORS[check.reason]); }
    if (check.kind === 'store-weighed') return setWeighed(true);
    go(check.code);
  };

  const granted = !!permission?.granted;
  const cameraUsable = cameraAvailable !== false && permission?.status !== 'denied';
  const showCamera = granted && cameraAvailable && focused && active;
  const showExamples = isWeb || !cameraUsable;
  const digits = input.replace(/\D/g, '').length;
  const viewfinderHeight = Math.max(240, Math.round(height * 0.45));

  return (
    <Screen>
      <Stack.Screen options={{ headerTitle: () => <BrandTitle /> }} />
      {cameraUsable ? (
        <View style={[styles.viewfinder, { height: viewfinderHeight, backgroundColor: c.pine }]}>
          {showCamera ? (
            <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }} onBarcodeScanned={onScanned} />
          ) : null}
          <Reticle lock={lock} />
          {granted ? (
            <View style={[styles.hint, { backgroundColor: c.scrim }]}>
              <AppText variant="meta" color={c.onScrim}>Point at a barcode</AppText>
            </View>
          ) : (
            <View style={styles.ask}>
              <Icon name="camera" size={32} color={c.onScrim} />
              <AppText color={c.onScrim} style={styles.center}>Scan barcodes with your camera.</AppText>
              <View style={styles.askButton}><Button kind="secondary" label="Allow camera" onPress={requestPermission} /></View>
            </View>
          )}
          {/* shortcut: torch is native-only; browser torch support is too uneven (E15). Upgrade with MediaStream track capabilities if web shoppers ask. */}
          {granted && !isWeb ? (
            <Pressable accessibilityRole="button" accessibilityLabel={torch ? 'Torch on' : 'Torch off'} aria-pressed={torch}
              onPress={() => setTorch(t => !t)} hitSlop={space.s2} style={[styles.torch, { backgroundColor: c.scrim }]}>
              <Icon name={torch ? 'torchOn' : 'torchOff'} size={22} color={c.onScrim} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.denied}>
          <AppText variant="title" accessibilityRole="header">Look up a product</AppText>
          <AppText color={c.muted}>{cameraAvailable === false ? 'No camera here. Type the barcode under the stripes.' : 'Camera access is off.'}</AppText>
          {permission?.status === 'denied' && !isWeb ? <Button kind="text" label="Open settings" onPress={() => Linking.openSettings()} fullWidth={false} /> : null}
        </View>
      )}

      {weighed ? (
        <Banner tone="info" testID="weighed-notice">
          <AppText>{"This is a store's own price label. Scan the ingredient label instead."}</AppText>
          <Button kind="secondary" label="Scan ingredient label" onPress={() => { setWeighed(false); router.push('/label'); }} fullWidth={false} />
        </Banner>
      ) : null}

      <Animated.View style={[styles.manual, shakeStyle]}>
        <TextField ref={field} testID="manual-entry" label="Barcode" placeholder="8 or 13 digits" value={input} error={error}
          hint={isWeb ? '/' : undefined} keyboardType="number-pad" inputMode="numeric" autoCorrect={false} returnKeyType="search"
          onChangeText={t => { setInput(t); setError(null); setWeighed(false); }} onSubmitEditing={submit}
          trailing={<Button kind={cameraUsable && granted ? 'secondary' : 'primary'} label="Look up" onPress={submit} disabled={digits < 8} fullWidth={false} />} />
        {digits > 0 && digits < 8 ? <AppText variant="meta" color={c.muted}>Barcodes have at least 8 digits</AppText> : null}
      </Animated.View>

      {showExamples ? (
        <View style={styles.examples} testID="example-barcodes">
          <AppText variant="section" accessibilityRole="header">Try a Danish example</AppText>
          <View style={styles.chips}>
            {EXAMPLE_BARCODES.map(e => <ExampleChip key={e.code} code={e.code} label={e.label} onPress={() => go(e.code)} />)}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

/** Pine, not lemon: lemon is kept for the one call to action (Look up). Chips are small (<200pt), so they press like buttons: a 0.97 spring scale, not a fade (Charles, anticipation). */
function ExampleChip({ code, label, onPress }: { code: string; label: string; onPress: () => void }) {
  const c = useTheme();
  const press = usePressScale();
  return (
    <Animated.View style={press.style}>
      <Pressable testID={`example-${code}`} accessibilityRole="link" accessibilityLabel={`${label}, barcode ${code}`}
        onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={[styles.chip, { backgroundColor: c.pine }]}>
        <AppText color={c.onPine}>{label}</AppText>
      </Pressable>
    </Animated.View>
  );
}

function Reticle({ lock }: { lock: SharedValue<number> }) {
  const c = useTheme();
  const snap = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.1 * lock.value }] }));
  const flash = useAnimatedStyle(() => ({ opacity: 0.25 * lock.value }));
  // Lemon reads on the dark camera feed (13.6:1) and marks where to aim: the scan's one highlight.
  const corner = { position: 'absolute' as const, width: 28, height: 28, borderColor: c.tertiary };
  return (
    <Animated.View pointerEvents="none" style={[styles.reticle, snap]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.tertiary, borderRadius: radius.sm }, flash]} />
      <View style={[corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.sm }]} />
      <View style={[corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.sm }]} />
      <View style={[corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.sm }]} />
      <View style={[corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.sm }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  viewfinder: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  reticle: { position: 'absolute', width: '72%', height: 120 },
  hint: { position: 'absolute', bottom: space.s4, paddingHorizontal: space.s3, paddingVertical: space.s1, borderRadius: radius.pill },
  ask: { alignItems: 'center', gap: space.s3, paddingHorizontal: space.s6 },
  askButton: { alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  torch: { position: 'absolute', top: space.s3, right: space.s3, width: layout.target, height: layout.target, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  denied: { gap: space.s2 },
  manual: { gap: space.s2 },
  examples: { gap: space.s3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2 },
  chip: { minHeight: layout.target, justifyContent: 'center', paddingHorizontal: space.s4, borderRadius: radius.sm },
});
