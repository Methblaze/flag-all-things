import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { BackBar, ResultSkeleton } from '@/components/chrome';
import { AppText, Screen } from '@/components/primitives';
import { ResultView } from '@/components/ResultView';
import { Banner } from '@/components/severity';
import { useToast } from '@/components/Toast';
import type { FlagReport, Product } from '@/domain/types';
import { usePrefs } from '@/hooks/usePrefs';
import { analyzeIngredientPhoto, LabelError } from '@/services/label';
import { prepareLabelImage } from '@/services/label-image';
import { getApiKey, saveScan } from '@/services/storage';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Photo = { uri: string; width: number; height: number };
type ErrorCode = LabelError['code'] | 'image';

const ERRORS: Record<ErrorCode, { text: string; action: 'retake' | 'retry' | 'settings' }> = {
  unreadable: { text: "Couldn't read a label in this photo. Try again with the ingredient list filling the frame.", action: 'retake' },
  'bad-key': { text: 'Your API key was rejected.', action: 'settings' },
  network: { text: 'No connection. Your photo is kept, so try again when you are online.', action: 'retry' },
  refused: { text: "This photo couldn't be processed. Try a different photo.", action: 'retake' },
  'invalid-response': { text: 'The reading came back incomplete. Try again.', action: 'retry' },
  busy: { text: 'The AI service is busy. Try again in a minute.', action: 'retry' },
  rejected: { text: 'Anthropic rejected the request. Check the credit and permissions on your API key.', action: 'settings' },
  image: { text: "This photo couldn't be opened. Try a different photo.", action: 'retake' },
};
const isWeb = Platform.OS === 'web';

export default function LabelScreen() {
  const c = useTheme();
  const toast = useToast();
  const { barcode } = useLocalSearchParams<{ barcode?: string }>();
  const { prefs } = usePrefs();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [reading, setReading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [result, setResult] = useState<{ product: Product; report: FlagReport } | null>(null);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);

  const pick = async (source: 'camera' | 'library') => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return pick('library');
    }
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.length) return; // cancelled: nothing changes
    const a = res.assets[0];
    setPhoto({ uri: a.uri, width: a.width, height: a.height });
    setError(null); setResult(null);
  };

  const read = async () => {
    if (!photo || reading) return; // one request at a time
    setReading(true); setError(null); setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 3000);
    try {
      const apiKey = await getApiKey();
      // No key: the example needs no image, so skip decoding (a portfolio visitor never hits an image error).
      let base64 = '';
      if (apiKey) {
        try { base64 = await prepareLabelImage(photo.uri, photo.width, photo.height); }
        catch { if (live.current) setError('image'); return; } // undecodable photo: retake, never a retry that fails again
      }
      const r = await analyzeIngredientPhoto(base64, prefs, { barcode: barcode ?? null, apiKey });
      if (r.product.source === 'label-ai') {
        // Example results are never saved: they would cache fake data under a real barcode.
        saveScan(r.product, r.report.verdict).then(() => toast({ message: 'Saved to History' }), () => toast({ message: "Couldn't save to History" }));
      }
      if (live.current) setResult(r);
    } catch (e) {
      if (live.current) setError(e instanceof LabelError ? e.code : 'invalid-response');
    } finally {
      clearTimeout(slowTimer);
      if (live.current) setReading(false);
    }
  };

  const errorAction = error ? ERRORS[error].action : null;

  return (
    <Screen>
      <BackBar />
      {result ? (
        <>
          {photo ? <Image source={photo.uri} style={styles.thumbSmall} contentFit="cover" alt="Your label photo" /> : null}
          {result.product.source === 'example' ? (
            <Banner tone="info" testID="example-banner">
              <AppText variant="meta">Example result. Add your key in Settings to read real labels.</AppText>
              <Button kind="text" label="Open Settings" onPress={() => router.navigate('/settings')} fullWidth={false} />
            </Banner>
          ) : null}
          <ResultView product={result.product} report={result.report} reveal />
          <Button kind="secondary" label="Scan another label" onPress={() => { setResult(null); setPhoto(null); }} />
        </>
      ) : (
        <>
          <View style={styles.intro}>
            <AppText variant="title" accessibilityRole="header">Scan ingredient label</AppText>
            <AppText>Photograph the ingredient list and nutrition table</AppText>
            <AppText variant="meta" color={c.muted}>Danish varedeklaration or English labels both work.</AppText>
          </View>

          {photo ? (
            <View style={styles.photoRow}>
              <Image source={photo.uri} style={[styles.thumb, reading && styles.dim]} contentFit="cover" alt="Your label photo" />
              <Pressable accessibilityRole="button" onPress={() => pick(isWeb ? 'library' : 'camera')} disabled={reading} style={styles.retake}>
                <AppText variant="bodyStrong" style={styles.underline}>{isWeb ? 'Choose another' : 'Retake'}</AppText>
              </Pressable>
            </View>
          ) : null}

          {error ? (
            <Banner tone="danger" testID="label-error">
              <AppText>{ERRORS[error].text}</AppText>
              {errorAction === 'settings' ? <Button kind="text" label="Open Settings" onPress={() => router.navigate('/settings')} fullWidth={false} /> : null}
              {errorAction === 'retake' ? <Button kind="text" label={isWeb ? 'Choose another photo' : 'Retake'} onPress={() => pick(isWeb ? 'library' : 'camera')} fullWidth={false} /> : null}
            </Banner>
          ) : null}

          {photo ? (
            <View style={styles.actions}>
              <Button label={errorAction === 'retry' ? 'Try again' : 'Read label'} loadingLabel="Reading label…" loading={reading} onPress={read} />
              {slow ? <AppText variant="meta" color={c.muted}>Still reading. Labels with small print take longer.</AppText> : null}
            </View>
          ) : (
            <View style={styles.actions}>
              <View testID="label-pick">
                <Button label={isWeb ? 'Choose photo' : 'Take photo'} icon="camera" onPress={() => pick(isWeb ? 'library' : 'camera')} />
              </View>
              {!isWeb ? <Button kind="secondary" label="Choose from library" icon="image" onPress={() => pick('library')} /> : null}
            </View>
          )}
          {reading ? <ResultSkeleton /> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.s2 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  thumb: { width: 64, height: 64, borderRadius: radius.sm },
  thumbSmall: { width: 48, height: 48, borderRadius: radius.sm },
  dim: { opacity: 0.5 },
  retake: { minHeight: 44, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
  actions: { gap: space.s2 },
});
