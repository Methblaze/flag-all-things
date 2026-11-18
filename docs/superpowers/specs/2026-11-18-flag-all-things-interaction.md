# Flag All Things: Interaction Spec

Date: 2026-11-18 · Stage 2 of 6 · Builds on the [design doc](2026-11-18-flag-all-things-design.md) and the [plan](../plans/2026-11-18-flag-all-things.md)

> **Copy updated after Stage 4:** Hallmark's floor bans middle-dot strings and em dashes in UI copy, so the strings below are the shipped ones (commas, full stops, parentheses, and separate Undo buttons).

This document says **how the app behaves**. Visual values (colours, type, radii, spacing) come from `DESIGN.md` in Stage 3. Exact motion curves come from Stage 5. Where this spec names a duration, it is the budget that Stage 5 must stay within.

---

## 0. Primary goals and the shortest path

| User | Goal | Shortest path | Target time |
|---|---|---|---|
| Owner, in the aisle | "Can I buy this?" | Open the app (Scan is the default tab) → point the camera → verdict | Lock under 1 s; cached verdict under 300 ms, uncached under 2 s on 4G |
| Owner, item not in OFF | Same | Verdict screen "Not found" → **Scan ingredient label** → photo → verdict | Under 15 s, mostly the AI call |
| Portfolio visitor (desktop) | "Show me what this does" | Lands on Scan → clicks an example chip → verdict → expands a section | 2 clicks to a full result |

**One purpose per screen:**
- **Scan:** get a code.
- **Result:** judge one product.
- **Label:** turn a photo into a result.
- **History:** find a past product.
- **Settings:** say what matters to me.

## 1. Global interaction rules

| Rule | Behaviour |
|---|---|
| Acknowledge within 100 ms | Every press shows its pressed state immediately. Anything that takes longer than 100 ms shows a skeleton or an inline progress indicator by 400 ms (Doherty threshold). |
| Skeletons, not spinners | Page-level loading uses skeletons that match the final layout. The only spinners are inside buttons, during the label upload. |
| Stale-while-revalidate | A cached product renders instantly. A background refresh shows the small "Updating…" text in the summary card's meta line, never a blocking state. |
| Optimistic preferences | Toggles in Settings apply instantly. If saving fails, the toggle snaps back and a toast says "Couldn't save. Try again.". |
| Undo, not "are you sure" | Deleting a history item gives an undo toast lasting 5 s. No confirm dialogs anywhere in v1. |
| No double actions | The scan gate ignores the same code for 3 s. The label "Read label" button goes into its loading state and refuses input while a request is in flight (one at a time). |
| Errors | Each error message says what happened, what to do next, and offers one action. User input (a typed barcode, a chosen photo) is always kept. |
| Colour is never the only signal | Each severity has a colour, an icon shape and a word (see §5). |
| Tap targets | At least 44×44 pt. Icon-only buttons get a hit area larger than the icon (`hitSlop`). |
| Safe areas | Content stays inside insets. The tab bar sits above the home indicator. The camera viewfinder may run full-bleed behind the status bar. |
| Numbers | Nutrition values, counts and dates use tabular figures, so values don't jiggle as they change. |
| Keyboard (web) | `/` focuses the barcode field from anywhere on Scan. `Enter` submits. `Esc` blurs the field, or goes back from Result and Label. `Tab` order follows reading order. Focus rings are always visible. A small `/` hint sits in the field when it isn't focused (desktop only). |
| Reduced motion | When the user prefers reduced motion, every movement becomes a ≤150 ms opacity fade, and the viewfinder's scan-line pulse stops. |
| Back | Result and Label are pushed onto the Scan stack. Hardware or gesture back and predictive back (Android) return to Scan with the camera resumed. On the web, browser back behaves the same way. |

**Requested UI elements left out on purpose:**
- **Command menu (⌘K):** there are three destinations and the tab bar already shows them.
- **Submenu safe triangle:** there are no submenus.
- **One-time-code autofill:** there's no sign-in.
- **Pre-rendering:** the web build is a single-page app, and the examples load instantly from cached data.

---

## 2. Flows

### F1 — Scan → hit (native, camera allowed)

```
Scan tab (viewfinder live, hint "Point at a barcode")
  → camera detects EAN/UPC
  → scan gate (same code within 3 s? ignore)
  → checkBarcode
      ├─ invalid checksum ............ ignore silently (camera misreads happen; no error flash)
      ├─ store-weighed (starts 2) .... inline notice under the viewfinder (see F1b); stay on Scan
      └─ product
           → success haptic + 120 ms frame "lock" tick on the viewfinder corners
           → push /product/[code]
               ├─ cached → render report at once (meta: "Saved <relative time>")
               │            └─ stale (>24 h) and online → refresh quietly; swap data in place
               └─ not cached → skeleton → fetchProduct
                     ├─ found ..... reveal summary card (the peak moment), save to History
                     ├─ not-found . F3
                     ├─ busy ...... busy state + Retry
                     └─ offline ... offline state + Retry
  → Back → Scan, camera resumes, gate still holds the last code for the rest of its 3 s
```

**F1b, a weighed-goods code.** The notice reads: "This is a store's own price label. Scan the ingredient label instead.". It has a secondary button **Scan ingredient label** that opens Label without a barcode. The notice dismisses itself once a different code is detected.

### F2 — Scan without a camera (web, desktop, permission denied)

```
Scan tab
  ├─ permission undetermined → camera area shows "Allow camera" primary button (system prompt on press)
  ├─ permission denied ....... camera area collapses; manual entry becomes the hero;
  │                            native: link "Open settings"; web: "Camera blocked in this browser"
  └─ no camera / insecure web  manual entry is the hero + "Try a Danish example" chips
Manual entry: type → Enter / "Look up"
  ├─ empty ..... button stays disabled ("Look up" enabled from 8 digits)
  ├─ invalid ... inline error under the field, field keeps text, focus stays in field
  ├─ weighed ... same notice as F1b
  └─ valid ..... push /product/[code] (same as F1 from "push")
Example chip → push /product/[example code]
```

### F3 — Not found → label fallback

```
Result screen, state "not-found":
  Title "Not in Open Food Facts yet"
  Body  "Danish store brands are often missing. Photograph the ingredient list (varedeklaration) and we'll read it."
  Primary   [Scan ingredient label] → /label?barcode=<code>
  Secondary [Enter a different barcode] → back to Scan with the manual field focused
```

### F4 — Label photo

```
/label (optional ?barcode=)
  Step hint "Photograph the ingredient list and nutrition table"
  ├─ native: primary [Take photo] (camera) · secondary [Choose from library]
  └─ web:    primary [Choose photo] (file / camera picker)
  → picker cancelled ........ stay, nothing changes
  → photo chosen ............ thumbnail preview + [Read label] primary + [Retake] secondary
  → [Read label]
       button → loading ("Reading label…"), preview dims, progress copy at 3 s: "Still reading. Labels with small print take longer."
       ├─ no key ............ example result (instant) → Result view with Example banner; NOT saved to History
       │                      (saving would cache fake data under a real barcode)
       ├─ success ........... Result view (same components as /product), saved to History, toast "Saved to History"
       ├─ unreadable ........ error: "Couldn't read a label in this photo. Try again with the ingredient list filling the frame." [Retake]
       ├─ bad-key ........... error: "Your API key was rejected." [Open Settings]
       ├─ network ........... error: "No connection. Your photo is kept, so try again when you are online." [Try again]
       ├─ refused ........... error: "This photo couldn't be processed. Try a different photo." [Retake]
       └─ invalid-response .. error: "The reading came back incomplete. Try again." [Try again]
  Photo is kept across every error until the user retakes or leaves.
```

The label result renders inside `/label`, in place: the photo collapses into a small thumbnail in the meta line. When a barcode came with the request, the result is also cached under that barcode, so scanning it again goes through F1.

### F5 — Inspect a result

```
Result: Summary card (verdict · headline · counts · meta) → Sections (accordions)
  Order: Allergens & traces · Diet & ethics · Additives · Nutrition · Processing
  Default expansion: any section containing a danger or warning flag starts expanded; others collapsed.
  Section header: name · worst-severity icon · count ("2 warnings") or "Not on record"
  Flag row: severity icon + title (+ "Your alert" tag when personal) → tap expands detail + source link
  Source link → opens in system browser (native) / new tab (web)
  Personal flag → secondary link "Change alerts" → Settings tab (deep-scrolled to that group)
```

### F6 — History

```
History tab
  ├─ empty → "No scans yet" + "Products you scan are saved here, so you can check them again offline." + [Scan a product]
  └─ list (newest first): thumbnail · name/brand · verdict word+dot · relative time
       tap → /product/[code] from cache (works offline)
       delete (native: swipe left reveals Delete; full swipe deletes · web: trailing × button)
         → row collapses (≤200 ms), toast "Removed" with an Undo button for 5 s
         → Undo → row returns to its original position
```

### F7 — Settings

```
Sections: Allergens · Diet · Alerts · AI label reading
  Toggle → instant (optimistic) → affected results recompute next time they're opened
  E-number alerts: field "Add E-number" accepts "E250", "e 250", "250" → chip "E250 Sodium nitrite" (×)
       invalid → inline "Use an E-number like E250"
  API key: paste → [Save key] → "Key saved" + masked "sk-ant-…a1b2" + [Remove key]
       Remove → key cleared immediately, toast "Key removed" with an Undo button
       Key is not validated on save (that would cost a call); first real read surfaces bad-key (F4)
```

### F8 — Deep link (web portfolio)

`/product/<code>` opens directly into F1 at "push" (cache, then fetch). Back with no history goes to `/`, the Scan tab, never to an empty page.

---

## 3. Edge cases

| # | Case | Behaviour |
|---|---|---|
| E1 | Offline, product cached | Render it. Meta line: "Offline. Saved 3 days ago". No error state. |
| E2 | Offline, not cached | Offline state: "You're offline" / "This product isn't saved on your phone yet. Try again when you have signal." [Try again] |
| E3 | OFF busy (429/503) | "Open Food Facts is busy" / "Try again in a minute." [Try again]. No automatic retry. |
| E4 | Partial data (name only) | Verdict `unknown`: "Not enough data to judge". Every section shows "Not on record". The [Scan ingredient label] CTA appears below the summary card, because the label can fill the gaps. |
| E5 | Allergen data missing and the user has allergen alerts | A warning flag at the top of Allergens: "Allergen info missing. Check the pack". The verdict is at least `caution`. |
| E6 | Malformed Danish ingredient text (OCR noise, ALL CAPS, line breaks) | Show it as printed in an "Ingredients" disclosure at the bottom of the result. Parsing tolerates it (plan Task 3). |
| E7 | Ingredients only in a third language | Show them, with the note "Ingredients not available in Danish or English". Engine text parsing still runs (E-numbers are language-neutral). |
| E8 | Camera reads the same code repeatedly | Scan gate: one navigation per 3 s. |
| E9 | Camera misread (bad checksum) | Ignore silently and keep scanning. |
| E10 | User leaves Result while a fetch is running | The fetch result still goes into History and the cache. No UI update is attempted. |
| E11 | Preferences changed after a scan | Opening a History item recomputes the verdict. The History row shows the stored verdict until the item is opened again. |
| E12 | History hits 200 | The oldest entry drops silently. |
| E13 | Storage write fails (web quota) | The result is still shown. Toast: "Couldn't save to History". |
| E14 | Very long product names or Danish compounds | Wrap. Never ellipsize the headline or the verdict. History rows cap names at 2 lines with an ellipsis. |
| E15 | Web on iOS Safari (no torch) | Hide the torch button. Don't show a disabled one. |
| E16 | Label photo is HEIC or PNG, or huge | Always resize and re-encode to JPEG before upload (plan Task 13). |
| E17 | App backgrounded while scanning | The camera pauses. On return it resumes and the gate resets. |
| E18 | Example banner on a label result | "Example result. Add your key in Settings to read real labels.". Shown above the summary card, with a link to Settings. |

---

## 4. Component states

Legend: **—** means the state doesn't apply, with the reason given. Pointer *hover* applies on web and desktop only. On native, *active* replaces it.

### 4.1 Button (primary / secondary / text): shared by every screen

| State | Behaviour |
|---|---|
| Default | Primary is filled with the strongest accent, one per view. Secondary is outlined or tonal. Text buttons are text plus an underline-on-focus. |
| Hover | Background shifts one tonal step. No layout shift. |
| Focus | Visible 2 px focus ring with an offset, at ≥3:1 contrast against the surroundings. |
| Active / pressed | Scales to 0.97 while held (Stage 5 spring), with a tonal shift. Fires on release. |
| Loading | The label is replaced with a spinner plus a verb ("Reading label…"). Width stays fixed, input is disabled, `aria-busy`. |
| Disabled | Reduced contrast, no hover. A helper line under the button explains why (e.g. "Enter at least 8 digits"). |
| Error | — Buttons don't show errors; the owning form or field does. |
| Success | — Routine. Success shows in the destination (navigation or toast). |
| Empty | — |
| Skeleton | A rounded block the button's size, inside page skeletons. |

### 4.2 Scan viewfinder

| State | Behaviour |
|---|---|
| Default | Live camera, a corner-bracket reticle, the hint "Point at a barcode", and the torch button (if supported) at the top-right inside the safe area. |
| Hover | — Touch surface. |
| Focus | — The viewfinder isn't focusable. Keyboard users go straight to the manual field. |
| Active (lock) | Detection gives a success haptic, then the reticle snaps to the code's bounds and ticks (≤120 ms), then navigation follows. |
| Loading | Camera starting: a dark surface with the reticle outline and "Starting camera…" after 400 ms. |
| Disabled | Permission denied or no camera: the area collapses and manual entry takes over (F2). |
| Error | The camera fails mid-session: "Camera stopped" + [Restart camera]. |
| Success | Same as Active (lock). The confirmation is the navigation. |
| Empty | — |
| Skeleton | — Use the Loading state. |

### 4.3 Manual barcode field

| State | Behaviour |
|---|---|
| Default | Label "Barcode" (always visible, never placeholder-only). Placeholder "5701234567899". Numeric keypad. A `/` hint on desktop. "Look up" button beside the field. |
| Hover | Border darkens one step. |
| Focus | Focus ring, and the `/` hint hides. |
| Active | Typing. Spaces and dashes are allowed and stripped on submit (Postel). |
| Loading | — Lookup happens on the next screen. |
| Disabled | — The field is never disabled. "Look up" is disabled below 8 digits. |
| Error | Red border, error icon and text below: "That barcode doesn't add up. Check the last digit." (checksum), "Barcodes are 8, 12 or 13 digits" (length), "Use digits only" (not-digits). Text and focus are kept. The error clears on the next edit. |
| Success | — Navigation. |
| Empty | Placeholder shows; "Look up" is disabled. |
| Skeleton | — |

### 4.4 Example chips (web / no-camera)

| State | Behaviour |
|---|---|
| Default | A row of 3–4 chips under the heading "Try a Danish example". Each chip carries the product name. |
| Hover | Tonal background. |
| Focus | Focus ring. Arrow keys move between chips. |
| Active | Pressed scale. |
| Loading | — Navigation is instant; the Result screen owns loading. |
| Disabled | — |
| Error | — |
| Success | — |
| Empty | Never empty (bundled). |
| Skeleton | — |

### 4.5 Torch button

| State | Behaviour |
|---|---|
| Default | Icon button (44 pt hit area) labelled "Torch off". |
| Hover | Tonal background. |
| Focus | Focus ring. |
| Active | Icon fills and the label changes to "Torch on" (`aria-pressed`). |
| Loading | — |
| Disabled | Not rendered when unsupported (E15). |
| Error | Toggling fails: the button reverts and a toast says "Torch not available". |
| Success | Covered by the Active state. |
| Empty | — |
| Skeleton | — |

### 4.6 Summary card (top of Result)

| State | Behaviour |
|---|---|
| Default | Verdict word plus severity icon (Avoid / Caution / OK / Good / Unknown) in the verdict colour; headline; counts row ("1 alert · 2 warnings · 3 notes · 1 good"); meta line (product name, brand, source, saved time). |
| Hover | — Not interactive. |
| Focus | — Not interactive. Screen readers announce the verdict and headline as one heading. |
| Active | — |
| Loading (refresh) | The content stays and the meta line shows "Updating…". |
| Disabled | — |
| Error | Refresh failed while cached data is showing: the meta line reads "Offline. Saved 3 days ago" or "Couldn't refresh". |
| Success | First reveal after a fetch: the card enters (Stage 5, ≤300 ms). This is the peak moment. |
| Empty | Verdict `unknown` with the headline "Not enough data to judge", plus the CTA "Scan ingredient label" (E4). |
| Skeleton | Verdict-line block, two headline lines, counts pills and meta line, matching the final heights so nothing shifts. |

### 4.7 Flag section (accordion)

| State | Behaviour |
|---|---|
| Default | Header: name, worst-severity icon, count text and a chevron. Collapsed unless it holds a danger or warning. |
| Hover | Header background tonal. |
| Focus | Focus ring on the header. `Enter` or `Space` toggles. `aria-expanded`. |
| Active | Chevron rotates and the height animates (interruptible; Stage 5 spring). |
| Loading | — Data arrives with the report. |
| Disabled | — |
| Error | — |
| Success | — |
| Empty | Header reads "Not on record", with a muted icon and no chevron. Not expandable. |
| Skeleton | Five header bars. |

### 4.8 Flag row

| State | Behaviour |
|---|---|
| Default | Severity icon + word (for screen readers), the title, and a "Your alert" tag when the flag is personal. |
| Hover | Tonal background. |
| Focus | Focus ring. Expands with `Enter`. |
| Active | Expands to show the detail sentence, the source link ("Source: EFSA ↗") and, for personal flags, "Change alerts". |
| Loading | — |
| Disabled | — |
| Error | A flag missing its source shows no link. (The engine guarantees sources for additive and nutrition flags.) |
| Success | — |
| Empty | — A section with no flags is a §4.7 Empty state. |
| Skeleton | — |

### 4.9 Label capture

| State | Behaviour |
|---|---|
| Default | Hint, plus [Take photo] / [Choose photo]. |
| Hover | Button states as in §4.1. |
| Focus | Button states as in §4.1. |
| Active | The picker is open. |
| Loading | A thumbnail of the photo, the dimmed [Read label] button in its loading state, and the progress copy at 3 s. The rest of the screen stays usable (Back works and cancels the request). |
| Disabled | [Read label] is disabled until a photo is chosen. |
| Error | Per-code copy and action (F4). The photo is kept. |
| Success | The result renders in place, with the toast "Saved to History". |
| Empty | No photo yet: the Default state. |
| Skeleton | After [Read label], the summary-card skeleton appears below the thumbnail. |

### 4.10 History row and list

| State | Behaviour |
|---|---|
| Default | Thumbnail (a colour placeholder that fades in once the image loads), name (2 lines max), brand, verdict dot + word, and relative time. |
| Hover | Tonal background. The web delete × button appears at full opacity. |
| Focus | Focus ring. `Delete` key removes the item, with the undo toast. |
| Active | Pressed tone. On native, swiping reveals Delete. |
| Loading | — Data is local and loads in under 50 ms. |
| Disabled | — |
| Error | History can't be read (corrupt): empty state plus the toast "History couldn't be loaded". |
| Success | Delete collapses the row and shows the undo toast. |
| Empty | "No scans yet" + explanation + [Scan a product]. |
| Skeleton | — Local read; avoids a flash. |

### 4.11 Undo toast

| State | Behaviour |
|---|---|
| Default | Bottom of the screen, above the tab bar: "Removed" with an Undo button. `role="status"`. |
| Hover | Pauses the 5 s timer. |
| Focus | Reachable by keyboard and pauses the timer. |
| Active | [Undo] pressed: the item is restored and the toast leaves. |
| Loading | — |
| Disabled | — |
| Error | Undo fails: "Couldn't restore". |
| Success | It leaves (≤200 ms). |
| Empty | — |
| Skeleton | — |

Swiping down dismisses the toast early. A new toast replaces the current one, and the earlier action commits.

### 4.12 Settings controls (switch, segmented, E-number input, API key field)

| State | Switch / segmented | E-number input | API key field |
|---|---|---|---|
| Default | Label, plus a description where needed | "Add E-number" + [Add] | Masked input + [Save key] + "Stored only on this device" |
| Hover | Tonal | Border darkens | Border darkens |
| Focus | Ring; `Space` toggles; arrows move the segment | Ring | Ring |
| Active | The thumb slides and the colour shifts instantly | Typing | Typing |
| Loading | — Optimistic | — | — Local save |
| Disabled | — | [Add] is disabled while empty | [Save key] is disabled while empty |
| Error | The save failed: the control snaps back, with a toast | "Use an E-number like E250" | — (bad keys surface in F4) |
| Success | The state itself | A chip appears | "Key saved" + masked key + [Remove key] |
| Empty | — | "No E-number alerts" helper | Empty input |
| Skeleton | — Prefs load in under 50 ms | — | — |

### 4.13 Banner (offline / example / stale)

A non-interactive strip above the summary card. It has an icon, a sentence and at most one link ("Open Settings").

| Banner | Copy |
|---|---|
| Example | "Example result. Add your key in Settings to read real labels." |
| Offline-cached | Shown in the meta line instead of a banner (E1), to keep the screen quiet. |

---

## 5. Severity system (Stage 3 must give each a colour token)

| Severity | Word | Icon shape | Meaning |
|---|---|---|---|
| danger | "Your alert" | Octagon ! | Conflicts with your settings |
| warning | "Warning" | Triangle ! | A sourced general concern |
| info | "Note" | Circle i | A neutral fact |
| good | "Good" | Circle ✓ | A positive signal |

| Verdict | Word | Severity colour |
|---|---|---|
| avoid | "Avoid" | danger |
| caution | "Caution" | warning |
| ok | "OK" | info |
| good | "Good" | good |
| unknown | "Unknown" | neutral |

## 6. Timing budgets (Stage 5 refines curves within these)

| Interaction | Budget |
|---|---|
| Press feedback | ≤100 ms, spring scale 0.97 |
| Scan lock tick | ≤120 ms, then navigate |
| Screen push / pop | 250–350 ms; interruptible; follows the gesture |
| Summary card reveal | ≤300 ms; content readable from the first frame (no fade from 0 that delays reading) |
| Accordion | 200–300 ms spring; interruptible mid-way |
| History row collapse | ≤200 ms |
| Toast in / out | 200 ms / 150 ms; swipe-to-dismiss |
| Skeleton shimmer | 1.5 s loop; static under reduced motion |

## 7. Haptics (native only, sparingly)

| Event | Haptic |
|---|---|
| Barcode lock | `notificationAsync(Success)` |
| A danger verdict revealed | `notificationAsync(Warning)`, once per result open |
| Switch toggle | `selectionAsync()` |
| Delete / undo | `impactAsync(Light)` |
| Everything else | None |

## 8. Copy rules

- Buttons start with a verb: Look up, Scan ingredient label, Take photo, Read label, Save key, Try again.
- Use "barcode", not "EAN". Use "ingredient list", and add "varedeklaration" once in the label hint.
- Sentence case everywhere. No exclamation marks. Never "Oops".
- The copy above is canonical. The e2e specs in the plan assert these exact strings: "Not in Open Food Facts yet", "Scan ingredient label", "Enter a different barcode", "This is a store's own price label. Scan the ingredient label instead.", "Example result. Add your key in Settings to read real labels.", "Removed" with an Undo button, "Not on record", "Key saved", "Remove key", "Stored only on this device".
