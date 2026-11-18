import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/primitives';
import { layout, motion, radius, space, z } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type ToastSpec = { message: string; actionLabel?: string; onAction?: () => void; onTimeout?: () => void };
const ToastContext = createContext<(t: ToastSpec) => void>(() => {});
export const useToast = () => useContext(ToastContext);

const TIMEOUT_MS = 5000;
const TAB_BAR = 56;

/** One toast at a time; a new one commits the previous one's pending action (interaction spec §4.11). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastSpec & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<ToastSpec | null>(null);

  const stop = () => { if (timer.current) clearTimeout(timer.current); };
  const dismiss = useCallback((commit: boolean) => {
    stop();
    if (commit) current.current?.onTimeout?.();
    current.current = null;
    setToast(null);
  }, []);
  const start = useCallback(() => { stop(); timer.current = setTimeout(() => dismiss(true), TIMEOUT_MS); }, [dismiss]);
  const show = useCallback((t: ToastSpec) => {
    current.current?.onTimeout?.();
    current.current = t;
    setToast({ ...t, key: Date.now() });
    start();
  }, [start]);
  useEffect(() => stop, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <ToastView key={toast.key} toast={toast} onPause={stop} onResume={start}
          onAction={() => { toast.onAction?.(); dismiss(false); }} />
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onAction, onPause, onResume }: { toast: ToastSpec; onAction: () => void; onPause: () => void; onResume: () => void }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + TAB_BAR + space.s3 }]}>
      <Animated.View
        entering={FadeIn.duration(motion.dur.base)}
        exiting={FadeOut.duration(motion.dur.fast)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: c.ink, shadowColor: c.shadow }]}
      >
        <AppText color={c.onInk} style={styles.message}>{toast.message}</AppText>
        {toast.actionLabel ? (
          <Pressable accessibilityRole="button" onPress={onAction} onHoverIn={onPause} onHoverOut={onResume}
            onFocus={onPause} onBlur={onResume} hitSlop={space.s2}
            style={styles.action}>
            <AppText variant="bodyStrong" color={c.onInk} style={styles.underline}>{toast.actionLabel}</AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.s4, zIndex: z.toast },
  toast: { width: '100%', maxWidth: layout.maxWidth - space.s8, flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingVertical: space.s2, paddingLeft: space.s4, paddingRight: space.s2, borderRadius: radius.lg, borderCurve: 'continuous', shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, shadowOpacity: 1, elevation: 4 },
  message: { flex: 1 },
  action: { minHeight: layout.target, minWidth: layout.target, justifyContent: 'center', paddingHorizontal: space.s3 },
  underline: { textDecorationLine: 'underline' },
});
