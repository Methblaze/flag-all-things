# DESIGN.md: Flag All Things

Stage 3 of 6. This is the single source of visual truth: screens use only these tokens. Behaviour lives in the [interaction spec](docs/superpowers/specs/2026-11-18-flag-all-things-interaction.md).

## 1. Direction

**Quiet Scandinavian utility: the label speaks, the app stays out of the way.**

- **Base style: Minimalism and Swiss** (from the UI/UX Pro Max search; WCAG AAA-friendly, low complexity).
  - A warm off-white canvas, near-black ink and a strict type hierarchy.
  - Spacing does the grouping; borders are used only where spacing can't.
- **Colour carries meaning, never decoration.** The four severity colours carry the verdicts. The primary action is solid ink, so a call-to-action is never mistaken for a severity.
- **Brand: ink and lemon (palette C, chosen 2026-11-19).** Ink is the primary. Warm sand (`secondary`) carries structure: the tab bar and control tracks on a sand-tinted canvas. Lemon (`tertiary`) is the one rare highlight: the active tab, the scan reticle and the example chips. Lemon's hue sits 36° from amber and is far lighter, so it never reads as a warning.
- **Rejected:**
  - The generator's first match, "Vibrant & Block-based" plus an orange call-to-action. It was matched to a landing page. The orange would collide with *warning*, and loudness works against the "not everything is red" anti-goal.
  - Glassmorphism, gradients and emoji icons.

## 2. Colour tokens

Every pair below was checked with a WCAG contrast script (2026-11-18). Body and ink text are ≥ 7:1, and all other text is ≥ 4.5:1. Non-text UI elements, including icons and the strong border, are ≥ 3:1.

### 2.1 Neutrals

| Token | Light | Dark | Use | Contrast (light / dark) |
|---|---|---|---|---|
| `canvas` | `#F6F4EE` | `#12110E` | Screen background (warm sand tint) | — |
| `surface` | `#FFFFFF` | `#1C1B17` | Cards, sections, inputs | — |
| `ink` | `#16181D` | `#F1F1EE` | Primary text, primary button fill, focus ring | 16.4 / 16.7 on canvas |
| `muted` | `#4F5562` | `#ABA696` | Secondary text, meta, placeholders | 6.8 / 7.8 on canvas, 6.1 / 6.2 on secondary |
| `border` | `#E2DDD0` | `#2E2C26` | Hairline dividers (decorative only) | — |
| `borderStrong` | `#8C9099` | `#6F6B60` | Input borders, outlined buttons | 3.2 / 3.2 on surface |
| `onInk` | `#FFFFFF` | `#16181D` | Text on the primary button | 17.8 / 15.1 |
| `scrim` | `rgba(16,17,19,0.6)` | `rgba(0,0,0,0.6)` | Behind the camera hint and the torch button | — |

### 2.1b Brand roles

| Token | Light | Dark | Use | Contrast (light / dark) |
|---|---|---|---|---|
| `secondary` | `#ECE7DA` | `#28261F` | Structural sand: tab bar, segmented-control track | ink 14.4 / 13.4 on it |
| `onSecondary` | `#4A4436` | `#D8D1BE` | Text and icons on `secondary` when ink is too loud | 7.8 / 9.9 |
| `tertiary` | `#E2F56A` | `#D7EC5A` | Lemon highlight: active-tab pill, scan reticle, example chips | 14.8 / 13.6 for `onTertiary`; 14.8 / 13.6 against the dark camera |
| `onTertiary` | `#16181D` | `#16181D` | Text and icons on lemon | — |

**Rules:**
1. **Lemon is a fill, never a line on light.** It is only about 1.2:1 against white, so use it only behind `onTertiary` content or on dark backgrounds (the camera). Never use it for text, icons or borders on canvas or surface.
2. **Lemon stays rare,** a few spots per screen, so it keeps its pull. It never marks a severity, a verdict or a destructive action.
3. **Every severity colour still passes on sand** (lowest: good `fg` 4.76:1 on `secondary`), so severity marks may sit on the tab bar or control tracks.

### 2.2 Severity (semantic)

Each severity has four tokens:
- `fg`: text and icons on surface, canvas or the tint
- `tint`: a soft background for chips, banners and the verdict block
- `solid`: the fill for verdict pills, *only* with `onSolid` text
- `onSolid`: the text on `solid`

| Severity | `fg` L / D | `tint` L / D | `solid` L / D | `onSolid` L / D | Lowest text contrast |
|---|---|---|---|---|---|
| `danger` | `#B42318` / `#FF8F85` | `#FDECEA` / `#3A1916` | `#B42318` / `#FF8F85` | `#FFFFFF` / `#16181D` | 5.75 |
| `warning` | `#8A4A00` / `#F5B851` | `#FFF4DC` / `#35260B` | `#E59A1A` / `#F5B851` | `#16181D` / `#16181D` | 6.28 |
| `info` | `#1F5BB5` / `#8DB8FF` | `#EAF2FD` / `#16243A` | `#1F5BB5` / `#8DB8FF` | `#FFFFFF` / `#16181D` | 5.78 |
| `good` | `#1B7340` / `#6FD394` | `#E8F5EC` / `#11291B` | `#1B7340` / `#6FD394` | `#FFFFFF` / `#16181D` | 5.23 |
| `neutral` | `#4F5562` / `#A7ACB6` | `#EEEEEA` / `#24262B` | `#4F5562` / `#A7ACB6` | `#FFFFFF` / `#16181D` | 6.43 |

**Rules:**
1. Icons, dots and text **always use `fg`**. Light-mode amber `solid` is only 2.3:1 on white, so `solid` is used only as a fill behind `onSolid` text.
2. **Severity is never colour alone.** Every use pairs the colour with the icon shape and the word from interaction spec §5:

   | Severity | Icon | Word |
   |---|---|---|
   | danger | octagon ! | Your alert |
   | warning | triangle ! | Warning |
   | info | circle i | Note |
   | good | circle ✓ | Good |
3. **Verdict → severity:**

   | Verdict | Severity |
   |---|---|
   | Avoid | `danger` |
   | Caution | `warning` |
   | OK | `info` |
   | Good | `good` |
   | Unknown | `neutral` |
4. Red appears **only** for personal conflicts (danger). Error *states* (form errors, failed requests) use `danger.fg` for the icon and text, which is consistent: something needs your attention.
5. Dark mode follows the system setting (`useColorScheme`). There is no in-app toggle in v1.

## 3. Typography

**Pairing: Figtree for headings and Noto Sans for body** (UI/UX Pro Max typography match: "medical, clean, accessible, trustworthy"). Both cover æ, ø and å. Both load with `@expo-google-fonts/figtree` and `@expo-google-fonts/noto-sans`, which work in Expo Go.

| Token | Font / weight | Size / line height (pt) | Use |
|---|---|---|---|
| `display` | Figtree 700 | 28 / 34 | The verdict word ("Caution") |
| `title` | Figtree 700 | 22 / 28 | Screen titles, the not-found title |
| `headline` | Figtree 600 | 18 / 24 | Summary headline, product name on Result |
| `section` | Figtree 600 | 17 / 22 | Accordion headers, Settings group headers |
| `body` | Noto Sans 400 | 16 / 24 | Flag titles, descriptions, inputs |
| `bodyStrong` | Noto Sans 600 | 16 / 24 | Button labels, emphasised values |
| `meta` | Noto Sans 400 | 14 / 20 | Brand, times, source links, helper text |
| `tag` | Noto Sans 600 | 13 / 16 | The "Your alert" tag, count pills. Never for sentences. |
| `ingredients` | Noto Sans 400 | 15 / 22 | The printed ingredient list (long, Danish) |

**Rules:**
- **Minimum 13 pt for any text; 16 pt for anything the user reads or types.** A 16 pt input also prevents iOS zoom on the web.
- **Numbers** (nutrition values, counts, dates) use `fontVariant: ['tabular-nums']`. Task 10 checks that Noto Sans honours `tnum` on iOS, Android and the web. If a platform ignores it, numerals there fall back to the system font with `tabular-nums`.
- **Dynamic Type is on.** `maxFontSizeMultiplier: 1.6` on `display` and `title`, and 2.0 on body text. Layouts must wrap rather than clip, even at 375 pt with 1.6× text.
- **No ellipsis on verdicts, headlines or flag titles** (interaction spec E14). History names clamp to 2 lines.
- **Balanced headlines:** on the web, set `text-wrap: balance` on `headline` and `title`. On native, keep headlines at 60 characters or fewer (the engine guarantees this), so a single orphaned word on the last line is rare.
- **Sentence case** everywhere. No all-caps labels and no letter-spacing tricks.

## 4. Spacing and layout

**4-pt base scale:**

| Token | `s1` | `s2` | `s3` | `s4` | `s5` | `s6` | `s8` | `s10` | `s12` |
|---|---|---|---|---|---|---|---|---|---|
| pt | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 |

| Rule | Value |
|---|---|
| Screen gutter | `s4` (16) below 414 pt wide, `s5` (20) from 414 pt |
| Gap between unrelated groups | `s6` (24), or `s8` (32) between page regions |
| Gap inside a group (label → control, row → row) | `s2`–`s3` |
| Card / section padding | `s4` |
| Content max width (web, tablet) | 600 pt, centred, with the canvas filling the rest. Desktop shows the app as a focused column: one purpose per screen, not a stretched dashboard. |
| Touch targets | ≥ 44×44 pt. List rows ≥ 56 pt tall. Icon buttons use a 24 pt glyph plus `hitSlop` to reach 44. |
| Safe areas | All screens use `react-native-safe-area-context` insets. The tab bar adds the bottom inset. The Scan viewfinder may extend under the status bar. |
| **iPhone SE budget (375×667)** | Scan: viewfinder ≤ 50% of screen height (min 240), with the manual field and tab bar visible without scrolling. Result: verdict, headline and counts fully visible above the fold, with the first section header peeking (Zeigarnik: there's more). |

## 5. Shape and elevation

| Token | Value | Use |
|---|---|---|
| `radius.sm` | 8 | Inputs, chips, tags, flag rows |
| `radius.md` | 12 | Buttons, sections, cards |
| `radius.lg` | 16 | Summary card, toast, viewfinder frame |
| `radius.pill` | 999 | Count pills, verdict pill |
| Corner smoothing | `borderCurve: 'continuous'` on iOS for every radius | Smooth, continuous corners |

**Elevation: borders first, shadows rarely.**

| Level | Treatment | Use |
|---|---|---|
| 0 | None | Canvas content |
| 1 | `surface` fill + 1 px `border` | Sections, cards, inputs (inputs use `borderStrong`) |
| 2 | `surface` + shadow `0 4 16 rgba(16,17,19,0.12)` (light) / 1 px `borderStrong` (dark) | Toast and the floating torch button only |

**Z-index scale:**

| Layer | z-index |
|---|---|
| Content | 0 |
| Sticky header | 10 |
| Tab bar | 20 |
| Banner | 30 |
| Toast | 50 |

## 6. Iconography

- **Feather icons through `@expo/vector-icons`.** They ship with Expo, so there's no new dependency. 24 pt in rows and buttons, 20 pt inline with meta text, 2 pt stroke.

| Purpose | Feather glyph |
|---|---|
| Severity | `alert-octagon` (danger), `alert-triangle` (warning), `info` (info), `check-circle` (good), `help-circle` (unknown/neutral) |
| Tabs | `maximize` (Scan), `clock` (History), `sliders` (Settings) |
| Actions | `zap` / `zap-off` (torch), `camera`, `image`, `trash-2`, `x`, `chevron-down`, `external-link`, `rotate-ccw` (undo) |

- No emoji as icons. Every icon-only button has an `accessibilityLabel`.

## 7. Imagery

- **Product photos come from OFF's `image_front_small_url`,** shown 48×48 in History and 56×56 in the Result meta line, with `radius.sm`.
  - While loading: a `secondary` (sand) block, fading in over 200 ms once the image arrives.
  - Missing image: the `package` Feather glyph on `secondary`. Never a broken image.
- **Label-photo thumbnail:** the user's own photo, 64×64, with `radius.sm`.
- **No stock illustration and no cartoon empty states** (anti-slop). Empty states are type plus one icon plus one action.

## 8. Motion tokens (Stage 5 tunes the curves within these limits)

| Token | Value | Use |
|---|---|---|
| `dur.instant` | 100 ms | Press feedback, colour changes |
| `dur.fast` | 150 ms | Toast exit, fades under reduced motion |
| `dur.base` | 200 ms | Toast enter, row collapse, image fade-in |
| `dur.slow` | 300 ms | Summary reveal, accordion, screen transitions |
| `spring.press` | Reanimated `{ damping: 20, stiffness: 400 }`, scale 0.97 | Buttons, chips, rows |
| `spring.layout` | `{ damping: 26, stiffness: 260 }` | Accordion height, list reflow (interruptible) |
| `ease.out` | `Easing.bezier(0.23, 1, 0.32, 1)` | Elements entering (strong ease-out) |
| `ease.inOut` | `Easing.bezier(0.77, 0, 0.175, 1)` | Moving or resizing on screen (accordion, switch thumb, list reflow) |
| `ease.in` | `Easing.bezier(0.55, 0, 1, 0.45)` | Elements leaving, on the shorter exit duration |
| `enter` / `exit` | 250 ms / 180 ms | Toast and sheet enter, exit about 25% faster |

- Animate only `transform` and `opacity`. Accordion height uses Reanimated layout animations, not the JS thread.
- **Reduced motion** (`useReducedMotion`): every movement becomes a `dur.fast` opacity change, and the skeleton shimmer stops.

## 9. Component rules (visuals; behaviour and the 10 states are in interaction spec §4)

| Component | Rules |
|---|---|
| **Primary button** | `ink` fill, `onInk` `bodyStrong` label, `radius.md`, height 48, full width on mobile. **One per view.** Hover: 8% `canvas` overlay. Pressed: `spring.press`. Disabled: 38% opacity plus the helper text below. Focus: 2 pt `ink` ring, 2 pt offset. |
| **Secondary button** | `surface` fill, 1 pt `borderStrong`, `ink` label, height 48. |
| **Text button** | `ink` `bodyStrong`, underlined on hover and focus, 44 pt hit area. |
| **Input** | `surface`, 1 pt `borderStrong`, `radius.sm`, height 48, `body`. Focus: 2 pt `ink` border. Error: 2 pt `danger.fg` border, plus a `danger.fg` icon and `meta` message below. The label sits above in `meta`, `muted`. |
| **Summary card** | `surface`, `radius.lg`, `s4` padding. Top row: a verdict pill (`solid` / `onSolid`) with icon and word in `display`. Then the `headline`, a counts row (each count is the icon + number + word in the severity `fg`, `tag` size), and the `meta` line in `muted`. A `tint` background on the whole card **only** for Avoid. |
| **Flag section** | `surface`, `radius.md`, 1 pt `border`, sections stacked with `s3` gaps. Header 56 pt: `section` name, worst-severity icon in `fg`, count in `meta`, chevron. Rows divided by 1 pt `border`. |
| **Flag row** | Min 52 pt. Severity icon (`fg`), title in `body`. The "Your alert" tag is `danger.tint` + `danger.fg` + `tag`. Detail text in `body`, `muted`. The source link is `meta` + `ink`, underlined, with an `external-link` icon. |
| **Banner** | `tint` of its severity (Example uses `info`), a `fg` icon, `meta` text in `ink`, `radius.md`, and at most one text link. |
| **Chip (example barcode, E-number)** | `surface`, 1 pt `borderStrong`, `radius.sm`, height 44, `body`. The E-number chip has a trailing `x` with a 44 pt target. |
| **Tab bar** | `surface` with a 1 pt top `border`. Icon plus `tag` label, always visible (never icon-only). Active: `ink`. Inactive: `muted`. |
| **Toast** | Elevation 2, `radius.lg`, `ink` background with `onInk` text in light mode (inverted for emphasis), the action as `bodyStrong` underlined. It sits `s3` above the tab bar. |
| **Skeleton** | `secondary` (sand) blocks at the final sizes and radii, with a shimmer sweep (1.5 s, linear) that is static under reduced motion. |
| **Viewfinder** | Full-width camera with a `radius.lg` mask. Corner brackets are 3 pt `#FFFFFF` strokes. The hint pill is `scrim` + white `meta`. The torch button is a 44 pt `scrim` circle, top-right inside the safe area. |
| **History row** | Height ≥ 64. Thumbnail 48, then name (`body`, 2 lines max) and brand (`meta`, `muted`), with a trailing verdict word and icon in `fg` and the time in `meta`. |

## 10. Accessibility checklist (gate for Stages 4–6)

- [ ] Every text pair meets §2 (re-run the contrast script if any token changes).
- [ ] Severity is shown with icon + word + colour everywhere.
- [ ] Focus is visible on every interactive element on the web, in `ink`, 2 pt, with an offset.
- [ ] `accessibilityRole` and `accessibilityLabel` are set on all Pressables. Accordions use `accessibilityState.expanded`.
- [ ] The verdict and headline are announced together as a header.
- [ ] Touch targets are ≥ 44 pt, and list rows ≥ 56 pt.
- [ ] No clipping at 375×667 with 1.6× text.
- [ ] Reduced motion is respected.
- [ ] No horizontal scroll at 375, 768, 1024 or 1440 wide.

## 11. Implementation mapping

- Tokens live in `src/theme/tokens.ts`, exported as `{ light, dark, type, space, radius, motion }`.
- `useTheme()` picks `light` or `dark` with `useColorScheme()`.
- Screens import tokens. **No raw hex values, font sizes or spacing numbers in screen files.** The Stage 4 Hallmark gate greps for `#[0-9A-Fa-f]{3,6}` outside `tokens.ts`.
- Fonts load once in `app/_layout.tsx` with `useFonts`. The splash screen is held until they load.
