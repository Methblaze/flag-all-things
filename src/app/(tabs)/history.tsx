import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { AppText, useGutter } from '@/components/primitives';
import { SeverityIcon, VERDICT } from '@/components/severity';
import { relativeTime } from '@/components/SummaryCard';
import { useToast } from '@/components/Toast';
import type { ScanHistoryItem } from '@/domain/types';
import { loadHistory, removeScan, restoreScan } from '@/services/storage';
import { layout, motion, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function HistoryScreen() {
  const c = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
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
    toast({ message: 'Removed', actionLabel: 'Undo', onAction: () => { restoreScan(item).then(setItems).catch(() => toast({ message: "Couldn't restore" })); } });
  };

  // Local read is < 50 ms; render nothing rather than flash a skeleton (§4.10).
  if (items === null) return <View style={{ flex: 1, backgroundColor: c.canvas }} />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.canvas }}
      contentContainerStyle={[styles.column, { paddingTop: insets.top + space.s4, paddingHorizontal: gutter }]}
      data={items}
      keyExtractor={i => i.id}
      ListHeaderComponent={<AppText variant="title" accessibilityRole="header" style={styles.title}>History</AppText>}
      ItemSeparatorComponent={() => <View style={{ height: space.s2 }} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Feather name="clock" size={28} color={c.muted} />
          <AppText variant="headline">No scans yet</AppText>
          <AppText color={c.muted}>Products you scan are saved here, so you can check them again offline.</AppText>
          <Button label="Scan a product" icon="maximize" onPress={() => router.navigate('/')} />
        </View>
      }
      renderItem={({ item }) => <Row item={item} onDelete={() => remove(item)} />}
    />
  );
}

function Row({ item, onDelete }: { item: ScanHistoryItem; onDelete: () => void }) {
  const c = useTheme();
  const { product } = item;
  const v = VERDICT[item.verdict];
  return (
    <View testID={`history-row-${item.id}`} style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${product.name ?? 'Unnamed product'}, ${v.word}, ${relativeTime(item.scannedAt)}`}
        onPress={() => router.push({ pathname: '/product/[barcode]', params: { barcode: item.id } })}
        style={styles.rowMain}
      >
        {product.imageUrl ? (
          <Image source={product.imageUrl} style={[styles.thumb, { backgroundColor: c.neutral.tint }]} contentFit="cover" transition={motion.dur.base} alt="" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: c.neutral.tint }]}><Feather name="package" size={20} color={c.muted} /></View>
        )}
        <View style={styles.text}>
          <AppText numberOfLines={2}>{product.name ?? 'Unnamed product'}</AppText>
          {product.brand ? <AppText variant="meta" color={c.muted} numberOfLines={1}>{product.brand}</AppText> : null}
          <View style={styles.verdict}>
            <SeverityIcon tone={v.tone} size={16} />
            <AppText variant="tag" color={c[v.tone].fg}>{v.word}</AppText>
            <AppText variant="meta" color={c.muted} tabular>{relativeTime(item.scannedAt)}</AppText>
          </View>
        </View>
      </Pressable>
      {/* shortcut: a visible delete button on every platform; Stage 5 adds swipe-to-delete on native. */}
      <Pressable testID={`delete-${item.id}`} accessibilityRole="button" accessibilityLabel={`Remove ${product.name ?? 'product'} from history`}
        onPress={onDelete} style={styles.delete}>
        <Feather name={Platform.OS === 'web' ? 'x' : 'trash-2'} size={20} color={c.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', paddingBottom: space.s8 },
  title: { marginBottom: space.s4 },
  empty: { gap: space.s3, alignItems: 'flex-start', paddingTop: space.s4 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous', minHeight: 64 },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.s3, padding: space.s3 },
  thumb: { width: 48, height: 48, borderRadius: radius.sm },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: space.s1, flexWrap: 'wrap', columnGap: space.s2 },
  delete: { width: layout.target, height: layout.target, alignItems: 'center', justifyContent: 'center', marginRight: space.s1 },
});
