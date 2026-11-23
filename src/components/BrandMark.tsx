import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedProps, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { MARK, flagPath } from '@/theme/brand';
import { useTheme } from '@/theme/useTheme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const POLE = '#F6F4EE'; // the mark's warm white (same as the app icon): the pole reads on the ink tile in both themes
const WAVE_MS = 2400;
const INSET = 0.72; // the mark fills 72% of its tile, as in scripts/brand-assets.mjs
const BOX = 100 / INSET;
const PAD = (BOX - 100) / 2;

/** The lemon flag on its ink tile (app icon, splash and this share src/theme/brand.ts).
 *  `wave` loops the pennant on a sine, so there is no seam; Reduce Motion keeps the still pose. */
export function BrandMark({ size = 28, wave = false }: { size?: number; wave?: boolean }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  // shortcut: web holds the still pose; animated SVG `d` props are native-only in this setup. Upgrade with a CSS keyframe path if the web build needs it.
  const live = wave && !reduced && Platform.OS !== 'web';
  const phase = useSharedValue<number>(MARK.restPhase);
  useEffect(() => {
    if (!live) return;
    phase.value = withRepeat(withTiming(MARK.restPhase + 2 * Math.PI, { duration: WAVE_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(phase);
  }, [live, phase]);
  const flag = useAnimatedProps(() => ({ d: flagPath(phase.value) }));
  const { knob: k, pole: p } = MARK;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      {/* The viewBox is the mark's box widened by 1/0.72 around its centre: the same 0.72 inset as the app icon, so this is the icon in miniature. */}
      <Svg width={size} height={size} viewBox={`${-PAD} ${-PAD} ${BOX} ${BOX}`}>
        <Rect x={-PAD} y={-PAD} width={BOX} height={BOX} rx={MARK.tileRadius / INSET} fill={c.onTertiary} />
        <Circle cx={k.cx} cy={k.cy} r={k.r} fill={POLE} />
        <Rect x={p.x} y={p.y} width={p.width} height={p.height} rx={p.rx} fill={POLE} />
        {live
          ? <AnimatedPath animatedProps={flag} fill={c.tertiary} stroke={c.tertiary} strokeWidth={MARK.flagStroke} strokeLinejoin="round" />
          : <Path d={flagPath(MARK.restPhase)} fill={c.tertiary} stroke={c.tertiary} strokeWidth={MARK.flagStroke} strokeLinejoin="round" />}
      </Svg>
    </View>
  );
}
