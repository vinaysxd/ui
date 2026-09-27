# React Native Paper (MD3) migration — design rules

Foundation step. This records the agreed colour-role mapping, the app's current theme-mode behaviour, and the tokens/rules every later migration step must follow. No screen under `app/` (other than `app/_layout.tsx`) or component under `src/components/` was touched to produce this document — see PLAN.md for the screen-by-screen audit this builds on.

## Theme mode

**Finding: the app has exactly one theme today, and it's static.** Every screen imports `COLORS` from `src/constants/theme.ts` directly and uses it as-is. There is no `useColorScheme()` call anywhere in `app/` or `src/`, no in-app light/dark toggle or store, and `LIGHT_COLORS` (also exported from `theme.ts`) has **zero consumers** in the current codebase — it's dead code as far as any screen is concerned. `app.json` sets `"userInterfaceStyle": "light"`, but that only affects native chrome (e.g. default OS dialogs), not anything JS-rendered; it doesn't wire up to `LIGHT_COLORS` and has no live effect on any screen's appearance.

**What this means for the Paper wiring:** `PaperProvider` is given `darkTheme` unconditionally, and the navigation `ThemeProvider` is given `navigationDarkTheme` unconditionally, in `app/_layout.tsx`. No `useColorScheme()`, no toggle, no persisted preference — reproducing exactly today's "always dark, no mode switching reachable from any screen" behaviour. `lightTheme` is still built in `src/theme/paperTheme.ts` (mirroring `LIGHT_COLORS` existing already), so a real light mode could be switched on later without redoing the token mapping — but nothing switches to it today, matching `LIGHT_COLORS`'s current status.

**Auth screens are already dark regardless.** `app/auth/login.tsx` and `app/auth/forgot-password.tsx` hardcode their own black palette instead of importing `theme.ts` at all (see PLAN.md section F). Since the whole app is dark-only today, this is currently a no-op distinction, but the rule below ("auth screens always use the dark theme regardless of mode") is recorded now so it still holds if a real mode switch is added later.

## Colour role mapping

`AppTheme` (`src/theme/paperTheme.ts`) extends Paper's `MD3Theme` with 5 custom roles (`success`, `successContainer`, `warning`, `warningContainer`, `goldInk`). Values are per-theme (`darkTheme` built from `COLORS`, `lightTheme` from `LIGHT_COLORS`).

| MD3 role | Dark value (from `COLORS`) | Light value (from `LIGHT_COLORS`) |
|---|---|---|
| `primary` | `gold` (`#C9A84C`) | `goldInk` (`#8A6A25`) |
| `onPrimary` | `background` (`#1A1A1A`) | `#FFFFFF` |
| `primaryContainer` | `accentBg` | `gold` (`#C9A84C`) |
| `onPrimaryContainer` | `goldLight` | `textPrimary` |
| `secondary` / `onSecondary` | *(not specified by name — aliased to `primary`/`onPrimary`; see note below)* | same |
| `secondaryContainer` | `accentBg` | `accentBg` |
| `onSecondaryContainer` | `goldLight` | `textPrimary` |
| `tertiary` / `onTertiary` / `tertiaryContainer` / `onTertiaryContainer` | *(not specified — aliased to secondary; see note)* | same |
| `background` | `background` | `background` |
| `surface`, `elevation.level1` | `surface` | `surface` |
| `surfaceVariant`, `elevation.level2` | `surfaceElevated` | `surfaceElevated` |
| `onSurface` | `textPrimary` | `textPrimary` |
| `onSurfaceVariant` | `textSecondary` | `textSecondary` |
| `outlineVariant` | `border` (dividers, card borders) | `border` |
| `outline` | new `outline` token (input borders) | new `outline` token |
| `error` | new `dangerText` token | `danger` |
| `errorContainer` | `dangerBg` | `dangerBg` |
| `onErrorContainer` | `dangerText` | `danger` |
| `success` (custom) | `success` | `success` |
| `successContainer` (custom) | `successBg` | `successBg` |
| `warning` (custom) | `warning` | `warning` |
| `warningContainer` (custom) | `warningBg` | `warningBg` |
| `goldInk` (custom) | `goldInk` | `goldInk` |

**Not specified in the brief, filled in during implementation (see `src/theme/paperTheme.ts` comments):**
- **`secondary`/`tertiary` and their `on*`/`*Container` pairs** aren't part of the given role list. This app has exactly one accent hue (gold) — there's no second or third brand colour anywhere in `theme.ts`. Rather than invent an unused hue, `secondary`/`tertiary` alias `primary`/`onPrimary`, and their containers alias `secondaryContainer` (`accentBg`/`goldLight`-or-`textPrimary`, per the rule given for `secondaryContainer`). If the product later grows a real second accent colour, this is the first thing to change.
- **`onPrimary`/`onSecondary`/`onTertiary` in dark mode** use `background` (`#1A1A1A`) rather than the `#1A1A1A` from the rule text's `onPrimary: dark #1A1A1A` — same value, just noting it's read from the `background` token rather than a separate literal, since they're numerically identical in this palette.
- **`onError`**: not given by name. Dark theme's `error` (`dangerText`, `#EF5350`) is a fairly light/saturated red, so `onError` is `background` (dark text) rather than white. Light theme's `error` (`danger`, `#C62828`) is a deep red, so `onError` is `#FFFFFF`. Both pass 4.5:1 (see contrast table below).
- **`surfaceDisabled`/`onSurfaceDisabled`**: per the brief, both derived from `textMuted` with alpha — `surfaceDisabled` at 12% and `onSurfaceDisabled` at 38%, matching MD3's own standard disabled-state opacities (Paper's default theme uses the same two percentages).
- **`inverseSurface`/`inverseOnSurface`/`inversePrimary`**: not specified. Each theme borrows the *other* theme's equivalent token (dark theme's `inverseSurface` = light theme's `surface`, etc.) — an inverse surface is by definition "what a surface looks like in the other mode," so this reuses existing tokens instead of inventing new hex values.
- **`shadow`/`scrim`**: both themes, `#000000` (MD3's own default for both, and consistent with `ProcessingOverlay`'s existing `rgba(0,0,0,0.7)` dark overlay elsewhere in the app).
- **`backdrop`**: `rgba(0, 0, 0, 0.6)`, exactly as specified.
- **Elevation levels 3–5**: the token set only defines 3 background steps (`background` → `surface` → `surfaceElevated`). `level0` is `transparent`, `level1` is `surface`, `level2` is `surfaceElevated` (as specified), and `level3`–`level5` all reuse `surfaceElevated` rather than fabricating hex values the app's own token file doesn't define. Any component that visually needs to look "more elevated" than `surfaceElevated` (e.g. a `Dialog`) will render flat against level 2 and above — acceptable for now since the dark-mode-depth-via-surface-steps rule below only defines 3 steps in the first place; revisit if a specific component's flatness reads wrong once it's migrated.

## Rules

- Gold is never text on a light background; use `goldInk`. Text on gold is `#1A1A1A`.
- `textMuted` is only for disabled states and placeholders, never for information users need to read — use `textSecondary` instead.
- Auth screens always use the dark theme regardless of mode (currently a no-op since there's only one mode — see "Theme mode" above).
- Icons: MaterialCommunityIcons only, via `@expo/vector-icons` (see `docs/paper-migration/ICON_MAP.md` for the full Ionicons → MCI mapping, wired into `PaperProvider`'s `settings.icon` in `app/_layout.tsx`).
- Gradients (`expo-linear-gradient`) allowed on auth screens and hero cards only; Paper surfaces placed on gradients get transparent backgrounds.
- Minimum touch target 48pt; the clock-in action is at least 56pt tall and full width.
- Dark-mode depth comes from surface steps (`background` → `surface` → `surfaceElevated`), not shadows.
- Shape: `roundness = 10/3` (≈3.33, so a component with `borderRadius: theme.roundness * 3` lands on `RADIUS.md`'s 10 — cards land around 10, buttons around 17 at Paper's default multiplier of ~5). Outlined `TextInput`s override to `RADIUS.sm` (6) via `outlineStyle`.
- `SPACING` tokens remain the only spacing values; no raw margin/padding numbers in migrated code.
- Typography: no raw `fontSize` in migrated code. Map: 11–12 → `labelSmall`/`bodySmall`; 13–14 → `bodyMedium`; 15–16 → `bodyLarge` (`titleMedium` if bold); 18–22 → `titleLarge`; 24+ → `headlineSmall`/`Medium`/`Large`.
- Modals: RN `Modal` is kept for `PhotoUploadModal` (full-screen, upload state). Confirmations use Paper `Portal` + `Dialog`.
- Headers use Paper `Appbar.Header` with `Appbar.BackAction` (replaces the 7 duplicated `BackButton` copies as screens migrate — see PLAN.md section D).
- Logic is off-limits during migration: stores, API calls, React Query hooks, routing, navigation params, permissions and upload logic. Only JSX, styles and imports change.

## Tokens added to `src/constants/theme.ts`

Added to both `COLORS` and `LIGHT_COLORS`, existing values unchanged:

| Token | Dark (`COLORS`) | Light (`LIGHT_COLORS`) |
|---|---|---|
| `goldInk` | `#C9A84C` | `#8A6A25` |
| `outline` | `#757575` | `#8A8578` |
| `dangerText` | `#EF5350` | `#C62828` |

## Contrast verification

Computed with a throwaway Node/Python script (not committed) implementing the standard WCAG relative-luminance formula, run against every foreground/background pair implied by the role mapping above, for both themes. "text" pairs need ≥4.5:1 (WCAG AA, normal text); "ui" pairs (outlines, icons-as-meaningful-boundaries) need ≥3:1 (WCAG 1.4.11, non-text contrast).

### Dark theme

| Foreground | Background | Kind | Ratio | Result |
|---|---|---|---|---|
| `onPrimary` | `primary` | text | 7.62:1 | PASS |
| `onPrimaryContainer` | `primaryContainer` | text | 8.94:1 | PASS |
| `onSecondaryContainer` | `secondaryContainer` | text | 8.94:1 | PASS |
| `onSurface` | `background` | text | 17.40:1 | PASS |
| `onSurface` | `surface` | text | 15.52:1 | PASS |
| `onSurface` | `surfaceElevated` | text | 13.58:1 | PASS |
| `onSurfaceVariant` | `background` | text | 6.19:1 | PASS |
| `onSurfaceVariant` | `surface` | text | 5.52:1 | PASS |
| `onSurfaceVariant` | `surfaceElevated` | text | 4.83:1 | PASS |
| `onError` | `error` | text | 4.99:1 | PASS |
| `onErrorContainer` | `errorContainer` | text | 4.71:1 | PASS |
| `error` | `background` | text | 4.99:1 | PASS |
| **`error`** | **`surface`** | **text** | **4.45:1** | **FAIL** |
| `success` | `background` | text | 6.26:1 | PASS |
| `success` | `successContainer` | text | 5.21:1 | PASS |
| `warning` | `background` | text | 8.10:1 | PASS |
| `warning` | `warningContainer` | text | 6.69:1 | PASS |
| `goldInk` | `background` | text | 7.62:1 | PASS |
| `goldInk` | `surface` | text | 6.79:1 | PASS |
| `primary` | `background` | ui | 7.62:1 | PASS |
| `outline` | `background` | ui | 3.78:1 | PASS |
| `outline` | `surface` | ui | 3.37:1 | PASS |
| **`outlineVariant`** | **`surface`** | **ui** | **1.23:1** | **FAIL** |
| **`outlineVariant`** | **`background`** | **ui** | **1.38:1** | **FAIL** |

### Light theme

| Foreground | Background | Kind | Ratio | Result |
|---|---|---|---|---|
| `onPrimary` | `primary` | text | 5.04:1 | PASS |
| `onPrimaryContainer` | `primaryContainer` | text | 7.62:1 | PASS |
| `onSecondaryContainer` | `secondaryContainer` | text | 15.12:1 | PASS |
| `onSurface` | `background` | text | 16.40:1 | PASS |
| `onSurface` | `surface` | text | 17.40:1 | PASS |
| `onSurface` | `surfaceElevated` | text | 14.89:1 | PASS |
| `onSurfaceVariant` | `background` | text | 6.50:1 | PASS |
| `onSurfaceVariant` | `surface` | text | 6.90:1 | PASS |
| `onSurfaceVariant` | `surfaceElevated` | text | 5.90:1 | PASS |
| `onError` | `error` | text | 5.62:1 | PASS |
| `onErrorContainer` | `errorContainer` | text | 4.92:1 | PASS |
| `error` | `background` | text | 5.30:1 | PASS |
| `error` | `surface` | text | 5.62:1 | PASS |
| `success` | `background` | text | 4.83:1 | PASS |
| `success` | `successContainer` | text | 4.56:1 | PASS |
| `warning` | `background` | text | 4.73:1 | PASS |
| `warning` | `warningContainer` | text | 4.73:1 | PASS |
| `goldInk` | `background` | text | 4.75:1 | PASS |
| `goldInk` | `surface` | text | 5.04:1 | PASS |
| `primary` | `background` | ui | 4.75:1 | PASS |
| `outline` | `background` | ui | 3.47:1 | PASS |
| `outline` | `surface` | ui | 3.68:1 | PASS |
| **`outlineVariant`** | **`surface`** | **ui** | **1.37:1** | **FAIL** |
| **`outlineVariant`** | **`background`** | **ui** | **1.29:1** | **FAIL** |

### Failures and what to do about them

1. **`error` (dangerText `#EF5350`) on `surface` (`#242424`), dark theme only — 4.45:1, just under the 4.5:1 text threshold.** This is a real, if marginal, shortfall: `dangerText` reads fine directly on `background` (4.99:1) but drops below AA the moment it's used as error text on top of a card/`surface`-coloured container (e.g. an inline validation message inside a `Surface`/`Card`). Not fixed in this foundation step — logic and token *values* were kept as given, only new tokens were *added* — but flagging it now: whoever migrates the first screen that puts error text on a `surface` background should either use `onSurface` + a error-tinted background chip instead of raw `error`-on-`surface`, or this specific value may need revisiting.
2. **`outlineVariant` (`border`) on `surface`/`background`, both themes — 1.2–1.4:1, far under the 3:1 non-text threshold.** This is **by design, not a bug**: `border` (`#333333` dark / `#E2DCCB` light) is deliberately a subtle, low-contrast hairline used for dividers and card outlines throughout the existing app (see every screen's `borderColor: COLORS.border` usage). WCAG's 1.4.11 non-text contrast requirement is meant for UI components and graphical objects a user needs to *perceive the boundary of to operate the interface* (e.g. an input's outline, a button's border) — a decorative divider or a card's subtle edge is generally exempt, which is exactly why the role mapping puts input borders on the separate, higher-contrast `outline` token (which does pass, 3.4–3.8:1) and reserves `outlineVariant` for the decorative case. No action needed, but recorded here since the instructions asked to flag every pair under threshold.

## Deviations from the instructions, and why

1. **`adaptNavigationTheme` was not fed a `@react-navigation/native` theme, because that package isn't installed.** `expo-router` 57.x (this app's version) no longer depends on `@react-navigation/native` as an npm package at all — it vendors its own copy internally and re-exports `DarkTheme`, `DefaultTheme`, `ThemeProvider`, `useTheme`, and a `Theme` type directly from `expo-router` itself (`node_modules/expo-router/build/exports.d.ts`). `react-native-paper`'s `adaptNavigationTheme` doesn't actually import `@react-navigation/native` either — its `NavigationTheme` parameter type is declared locally inside the package and isn't part of its public type exports. Since TypeScript couldn't structurally unify `expo-router`'s `Theme` (`colors.*: ColorValue`) against Paper's un-exported `NavigationTheme` (`colors.*: string`) without a cast, `src/theme/paperTheme.ts` re-declares Paper's expected shape locally (`PaperNavigationTheme`) and casts `expo-router`'s `DarkTheme`/`DefaultTheme` through it before calling `adaptNavigationTheme`, then casts the result back to `expo-router`'s own `Theme` type for the `ThemeProvider` in `app/_layout.tsx`. The runtime objects match exactly either way — this is a types-only workaround, documented in code comments in `paperTheme.ts`.
2. **`SafeAreaProvider` was not added in `app/_layout.tsx`.** The instructions said to wrap `PaperProvider` "inside the existing `SafeAreaProvider` if present" — there isn't one in this file today (screens rely on `react-native-safe-area-context`'s `SafeAreaView`/`useSafeAreaInsets` directly, without a top-level provider). Per "change nothing else in that file," none was added; this is worth a decision in a later step, since Paper's own components (`Appbar`, `Modal`, etc.) generally work correctly without one, but it's not guaranteed for every edge case.
3. **`configureFonts` was not called.** PLAN.md confirms no custom fonts are loaded anywhere in the app (no `useFonts`/`Font.loadAsync`/custom `fontFamily`). `darkTheme`/`lightTheme` inherit `fonts` from `MD3DarkTheme`/`MD3LightTheme` via the object spread, unmodified — calling `configureFonts()` with no arguments would have produced the identical `MD3Typescale` object, so it was left out rather than adding a no-op call.
