import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ChipToggle, Segmented, ToggleRow } from '@/components/controls';
import { AppText, Card, Screen } from '@/components/primitives';
import { Icon } from '@/components/Icon';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { ALLERGEN_KEYS, type UserPreferences } from '@/domain/types';
import { lookupAdditive } from '@/engine/data/additives';
import { ALLERGEN_LABELS } from '@/engine/data/allergens';
import { usePrefs } from '@/hooks/usePrefs';
import { setAppearance, useAppearanceChoice, type AppearanceChoice } from '@/theme/appearance';
import { getApiKey, setApiKey } from '@/services/storage';
import { layout, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1);
const maskKey = (k: string) => `${k.slice(0, 7)}…${k.slice(-4)}`;

/** Accepts "E250", "e 250", "250", "E-160a" (Postel). */
export function normaliseENumber(input: string): string | null {
  const s = input.toLowerCase().replace(/[\s-]/g, '');
  const code = /^\d/.test(s) ? `e${s}` : s;
  return /^e\d{3,4}[a-z]{0,3}$/.test(code) ? code : null;
}

function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <AppText variant="section" accessibilityRole="header">{title}</AppText>
        {description ? <AppText variant="meta" color={c.muted}>{description}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const c = useTheme();
  const toast = useToast();
  const { prefs, setPrefs, loaded } = usePrefs();
  const appearance = useAppearanceChoice();
  const set =<K extends keyof UserPreferences>(k: K, v: UserPreferences[K]) => setPrefs({ ...prefs, [k]: v });

  const [eInput, setEInput] = useState('');
  const [eError, setEError] = useState<string | null>(null);
  const addENumber = () => {
    const code = normaliseENumber(eInput);
    if (!code) return setEError('Use an E-number like E250');
    if (!prefs.additiveAlerts.includes(code)) set('additiveAlerts', [...prefs.additiveAlerts, code]);
    setEInput(''); setEError(null);
  };

  const [key, setKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  useEffect(() => { getApiKey().then(setKey, () => setKey(null)); }, []);
  const saveKey = async () => {
    const k = keyInput.trim();
    try {
      await setApiKey(k); setKey(k); setKeyInput(''); setKeyError(null);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // the card swaps in place; the buzz confirms it
    }
    catch { setKeyError("Couldn't save the key in this browser. Private browsing may block storage."); }
  };
  const removeKey = async () => {
    const old = key;
    await setApiKey(null).catch(() => {});
    setKey(null);
    toast({ message: 'Key removed', actionLabel: 'Undo', onAction: () => { if (old) setApiKey(old).then(() => setKey(old)).catch(() => {}); } });
  };

  // A toggle tapped before prefs load would save defaults plus one change.
  if (!loaded) return <Screen>{null}</Screen>;

  return (
    <Screen>

      <Group title="Allergens" description="Products containing these get a red alert.">
        <View style={styles.allergens}>
          {ALLERGEN_KEYS.map(k => (
            <ChipToggle key={k} testID={`pref-allergen-${k}`} label={capitalise(ALLERGEN_LABELS[k])} value={prefs.allergens.includes(k)}
              onChange={on => set('allergens', on ? [...prefs.allergens, k] : prefs.allergens.filter(a => a !== k))} />
          ))}
        </View>
      </Group>

      <Group title="Diet">
        <Segmented testID="pref-diet" label="I eat" value={prefs.diet} onChange={v => set('diet', v)}
          options={[{ value: 'none', label: 'Anything' }, { value: 'vegetarian', label: 'Vegetarian' }, { value: 'vegan', label: 'Vegan' }]} />
      </Group>

      <Group title="Alerts">
        <Segmented testID="pref-nova" label="Alert me about processing" value={String(prefs.novaAlert ?? 'off')}
          onChange={v => set('novaAlert', v === 'off' ? null : (Number(v) as 3 | 4))}
          options={[{ value: 'off', label: 'Off' }, { value: '3', label: 'NOVA 3+' }, { value: '4', label: 'NOVA 4' }]} />
        <Card>
          <ToggleRow testID="pref-palm-oil" label="Palm oil" description="Alert when palm oil is listed." value={prefs.avoidPalmOil} onChange={v => set('avoidPalmOil', v)} />
        </Card>
        <TextField testID="pref-enumber-input" label="E-number alerts" placeholder="E250" value={eInput} error={eError}
          autoCapitalize="characters" autoCorrect={false} onChangeText={t => { setEInput(t); setEError(null); }} onSubmitEditing={addENumber}
          trailing={<Button kind="secondary" label="Add" onPress={addENumber} disabled={!eInput.trim()} fullWidth={false} />} />
        {prefs.additiveAlerts.length ? (
          <View style={styles.chips}>
            {prefs.additiveAlerts.map(code => (
              <View key={code} style={[styles.chip, { borderColor: c.borderStrong, backgroundColor: c.surface }]}>
                <AppText numberOfLines={1} style={styles.shrink}>
                  <AppText variant="bodyStrong" tabular>{'E' + code.slice(1)}</AppText>
                  <AppText color={c.muted}>{' ' + (lookupAdditive(code)?.en ?? 'Unknown additive')}</AppText>
                </AppText>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove E${code.slice(1)}`} hitSlop={space.s2}
                  onPress={() => set('additiveAlerts', prefs.additiveAlerts.filter(a => a !== code))}
                  style={styles.chipX}>
                  <Icon name="close" size={16} color={c.ink} weight="semibold" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : <AppText variant="meta" color={c.muted}>No E-number alerts</AppText>}
      </Group>

      <Group title="Appearance">
        <Segmented<AppearanceChoice> testID="pref-appearance" label="Theme" value={appearance} onChange={setAppearance}
          options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </Group>

      <Group title="AI label reading" description="Reads ingredient labels for products missing from Open Food Facts, using your own Anthropic API key.">
        {key ? (
          <Card style={styles.keyCard}>
            <View style={styles.keyRow}>
              <Icon name="good" size={20} color={c.good.fg} weight="semibold" />
              <View style={styles.shrink}>
                <AppText variant="bodyStrong">Key saved</AppText>
                <AppText variant="meta" color={c.muted} tabular>{maskKey(key)}</AppText>
              </View>
            </View>
            <Button kind="text" label="Remove key" onPress={removeKey} fullWidth={false} />
          </Card>
        ) : (
          <View style={styles.group}>
            <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync('https://console.anthropic.com/settings/keys')} style={styles.link}>
              <AppText variant="meta" style={styles.underline}>Get a key from the Anthropic Console</AppText>
              <Icon name="external" size={14} color={c.ink} />
            </Pressable>
            <TextField testID="pref-api-key" label="Anthropic API key" placeholder="sk-ant-…" value={keyInput} error={keyError}
              secureTextEntry autoCapitalize="none" autoCorrect={false} onChangeText={t => { setKeyInput(t); setKeyError(null); }} onSubmitEditing={saveKey} />
            <Button label="Save key" onPress={saveKey} disabled={!keyInput.trim()} helper="Paste a key to save it." />
          </View>
        )}
        <AppText variant="meta" color={c.muted}>Stored only on this device</AppText>
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.s3 },
  groupHead: { gap: space.s1 },
  allergens: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2 },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.s1, minHeight: layout.target, alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
  chips: { gap: space.s2 },
  chip: { minHeight: layout.target, flexDirection: 'row', alignItems: 'center', gap: space.s2, paddingLeft: space.s3, borderWidth: 1, borderRadius: radius.sm, borderCurve: 'continuous' },
  chipX: { width: layout.target, height: layout.target, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  shrink: { flex: 1, minWidth: 0 },
  keyCard: { padding: space.s4, gap: space.s2 },
  keyRow: { flexDirection: 'row', gap: space.s3, alignItems: 'center' },
});
