import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { AppText, Separator, useGutter } from '@/components/primitives';
import { SeverityIcon, VERDICT } from '@/components/severity';
import { ProductThumb, relativeTime } from '@/components/SummaryCard';
import { useToast } from '@/components/Toast';
import { saveWithRetry } from '@/services/retry';
import type { ScanHistoryItem } from '@/domain/types';
import { loadHistory, removeScan, restoreScan } from '@/services/storage';
import { layout, motion, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const isWeb = Platform.OS === 'web';
const TEXT_INSET = space.s3 + 48 + space.s3; // row padding + thumbnail + gap: where the product name starts
// Remaining rows close the gap, and a restored row opens one: moving in place, ease-in-out.
const reflow = LinearTransition.duration(motion.dur.base).easing(motion.ease.inOut);

export default function HistoryScreen() {
  const c = useTheme();
  const toast = useToast();
  const gutter = useGutter();
  const [items, setItems] = useState<ScanHistoryItem[] | null>(null);

  useFocusEffect(useCallback(() => {
    let live = true;
    loadHistory().then(h => { if (live) setItems(h); });
    return () => { live = false; };
  }, []));

  const remove = (item: ScanHistoryItem) => {
    setItems(list => list?.filter(i => i.id !== item.id) ?? null); // optimistic
    removeScan(item.id).catch(() => loadHistory().then(setItems));
    toast({ message: 'Removed', actionLabel: 'Undo', onAction: () => saveWithRetry(toast, "Couldn't restore", () => restoreScan(item).then(setItems)) });
  };

  // Local read is < 50 ms; render nothing rather than flash a skeleton (§4.10).
  if (items === null) return <View style={{ flex: 1, backgroundColor: c.canvas }} />;

  return (
    <Animated.FlatList
      itemLayoutAnimation={reflow}
      style={{ flex: 1, backgroundColor: c.canvas }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.column, { paddingTop: space.s4, paddingHorizontal: gutter }]}
      data={items}
      extraData={items.length} // a delete or undo moves the group's ends, so neighbours re-render their corners
      keyExtractor={i => i.id}
      // One inset group: the hairline sits on surface so the gap never shows canvas, and starts where the text does.
      ItemSeparatorComponent={() => <View style={{ backgroundColor: c.surface }}><Separator inset={TEXT_INSET} /></View>}
      ListEmptyComponent={
        <View style={styles.empty}>
          <BrandMark size={56} wave />
          <AppText variant="headline">No scans yet</AppText>
          <AppText color={c.muted}>Products you scan are saved here, so you can check them again offline.</AppText>
          <Button label="Scan a product" icon="scan" onPress={() => router.navigate('/')} />
        </View>
      }
      renderItem={({ item, index }) => <Row item={item} first={index === 0} last={index === items.length - 1} onDelete={() => remove(item)} />}
    />
  );
}

function Row({ item, first, last, onDelete }: { item: ScanHistoryItem; first: boolean; last: boolean; onDelete: () => void }) {
  const c = useTheme();
  // Only the group's ends are rounded; the swipe container takes the same corners so the action never pokes past them.
  const ends = [first && styles.top, last && styles.bottom];
  const { product } = item;
  const v = VERDICT[item.verdict];
  const name = product.name ?? 'Unnamed product';

  const row = (
    <View
      testID={`history-row-${item.id}`}
      style={[styles.row, { backgroundColor: c.surface }, ends]}
      accessibilityActions={[{ name: 'delete', label: 'Remove from history' }]}
      onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'delete') onDelete(); }}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${name}, ${v.word}, ${relativeTime(item.scannedAt)}`}
        onPress={() => router.push({ pathname: '/product/[barcode]', params: { barcode: item.id } })}
        style={({ pressed }) => [styles.rowMain, pressed && { backgroundColor: c.canvas }]}
      >
        <ProductThumb uri={product.imageUrl} size={48} alt="" />
        <View style={styles.text}>
          <AppText numberOfLines={2}>{name}</AppText>
          {product.brand ? <AppText variant="meta" color={c.muted} numberOfLines={1}>{product.brand}</AppText> : null}
          <View style={styles.verdict}>
            <SeverityIcon tone={v.tone} size={16} />
            <AppText variant="tag" color={c[v.tone].fg}>{v.word}</AppText>
            <AppText variant="meta" color={c.muted} tabular>{relativeTime(item.scannedAt)}</AppText>
          </View>
        </View>
      </Pressable>
      {isWeb ? (
        <Pressable testID={`delete-${item.id}`} accessibilityRole="button" accessibilityLabel={`Remove ${name} from history`} onPress={onDelete} style={styles.delete}>
          <Icon name="close" size={18} color={c.muted} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    // Leaves faster than it came, with a fade; the list's reflow closes the gap.
    <Animated.View exiting={FadeOut.duration(motion.dur.fast).easing(motion.ease.in)}>
      {isWeb ? row : (
        // Swipe left past 40pt (or flick) to delete. Undo sits in the toast, so there is no confirm step.
        <ReanimatedSwipeable
          rightThreshold={40}
          overshootRight={false}
          containerStyle={[styles.swipe, ends]}
          onSwipeableOpen={onDelete}
          renderRightActions={() => (
            <View style={[styles.swipeAction, { backgroundColor: c.pine }]}>
              <Icon name="trash" size={20} color={c.onPine} weight="semibold" />
              <AppText variant="bodyStrong" color={c.onPine}>Delete</AppText>
            </View>
          )}
        >
          {row}
        </ReanimatedSwipeable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', paddingBottom: space.s8 },
  empty: { gap: space.s3, alignItems: 'flex-start', paddingTop: space.s4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64, overflow: 'hidden' },
  top: { borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, borderCurve: 'continuous' },
  bottom: { borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md, borderCurve: 'continuous' },
  swipe: { overflow: 'hidden' },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.s3, padding: space.s3 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: space.s1, flexWrap: 'wrap', columnGap: space.s2 },
  swipeAction: { flexDirection: 'row', alignItems: 'center', gap: space.s2, paddingHorizontal: space.s5 },
  delete: { width: layout.target, height: layout.target, alignItems: 'center', justifyContent: 'center', marginRight: space.s1 },
});
