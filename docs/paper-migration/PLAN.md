# React Native Paper (MD3) Migration — Audit

Audit only. No source or dependency changes were made while producing this document.

## A. Environment

| Package | Version |
|---|---|
| expo | ~57.0.24 |
| react-native | 0.86.3 |
| react | 19.2.3 |
| react-dom | ^19.2.3 |
| react-native-reanimated | 4.5.1 |
| expo-router | ~57.0.22 |
| expo-font | ~57.0.4 |

- **`newArchEnabled`**: not set in `app.json`. Expo SDK 57 defaults the New Architecture to enabled, so this app is effectively running on it. Worth confirming explicitly before migrating, since Paper + New Architecture has occasional edge cases (ripple/elevation on Android).
- **Fonts**: `expo-font` and the `expo-font` config plugin are present, but grep finds no `useFonts`, `Font.loadAsync`, or custom font family anywhere in `app/` or `src/`. The app renders entirely in the platform default font (San Francisco / Roboto). There is nothing to reconcile with Paper's `configureFonts` — a plain MD3 font config would be a clean default.
- **`react-native-reanimated`** is installed but **not imported anywhere** in `app/` or `src/`. The three admin list screens that expand/collapse rows (`clients.tsx`, `sites.tsx`, `staff.tsx`) animate with React Native's built-in `Animated` API instead. This is a dead dependency as far as the current UI goes — worth noting since Paper itself doesn't require reanimated, but some Paper-adjacent libraries (e.g. bottom sheets) do.

## B. Theme tokens

Verbatim contents of `src/constants/theme.ts` (the only theme/token file in the repo):

```ts
export const COLORS = {
  background: "#1A1A1A",
  surface: "#242424",
  surfaceElevated: "#2E2E2E",
  border: "#333333",
  gold: "#C9A84C",
  goldLight: "#E8C97A",
  goldDark: "#A67C35",
  textPrimary: "#FFFFFF",
  textSecondary: "#9A9A9A",
  textMuted: "#666666",
  success: "#4CAF50",
  successBg: "#1A2E1A",
  danger: "#E53935",
  dangerBg: "#2E1A1A",
  warning: "#F59E0B",
  warningBg: "#2E2A1A",
  accentBg: "#2E2A1A",
};

export const LIGHT_COLORS: typeof COLORS = {
  background: "#FAF8F3",
  surface: "#FFFFFF",
  surfaceElevated: "#F1EDE3",
  border: "#E2DCCB",
  gold: "#C9A84C",
  goldLight: "#E8C97A",
  goldDark: "#A67C35",
  textPrimary: "#1A1A1A",
  textSecondary: "#5A5A5A",
  textMuted: "#9A9A9A",
  success: "#2E7D32",
  successBg: "#E8F5E9",
  danger: "#C62828",
  dangerBg: "#FDECEA",
  warning: "#B45309",
  warningBg: "#FFF8E1",
  accentBg: "#F5EFDA",
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const RADIUS = { sm: 6, md: 10, lg: 16, xl: 24, full: 999 };
```

Notes:
- `LIGHT_COLORS` is exported and typed against `COLORS`, but is only ever read in one place: `app/auth/login.tsx`'s predecessor used an `isDark` toggle. As of the current `login.tsx`, the screen is hardcoded to pure black (`#000000`) and no longer imports `theme.ts` at all — it has its own local hex constants. **`LIGHT_COLORS` currently has no live consumer** (confirm with a repo-wide grep before deleting it during migration).
- There is no `TYPOGRAPHY`/font-size scale, no shadow/elevation tokens, and no `Z_INDEX` scale exported from `theme.ts` or anywhere else. Font sizes and border radii are set ad hoc per screen (see section F).
- No other file defines a competing color/spacing/radius table. `src/constants/ui.ts` exports only `LOADING_STYLE = { opacity: 0.7 }` (a single style object, not a token set). `src/constants/app_constants.ts` holds only the API base URL.

## C. Screen inventory

33 `.tsx` files under `app/`: 7 `_layout.tsx` files (see section G) and 26 screens, grouped below.
#### Auth screens (2)

| Path | Lines | RN primitives | Shared components | Gradient | SafeArea | Edges | Modal | TextInput | Risk flags |
|---|---|---|---|---|---|---|---|---|---|
| `app/auth/forgot-password.tsx` | 174 | View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, KeyboardAvoidingView | - | no | yes | - | no | yes | keyboard handling |
| `app/auth/login.tsx` | 195 | View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet, KeyboardAvoidingView | - | no | yes | - | no | yes | keyboard handling |

#### Admin screens (11)

| Path | Lines | RN primitives | Shared components | Gradient | SafeArea | Edges | Modal | TextInput | Risk flags |
|---|---|---|---|---|---|---|---|---|---|
| `app/(admin)/(tabs)/clients.tsx` | 547 | View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, RefreshControl | - | yes | no | (inherited from parent layout) | no | yes | gradient bg, custom Animated (RN core, not reanimated), long list + heavy screen |
| `app/(admin)/(tabs)/dashboard.tsx` | 309 | View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, RefreshControl | admin/AttendanceCard, admin/AttendanceRow, admin/StatCard | yes | no | (inherited from parent layout) | no | no | gradient bg |
| `app/(admin)/(tabs)/settings.tsx` | 743 | View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet, KeyboardAvoidingView | ImageSourceSheet | yes | no | (inherited from parent layout) | no | yes | keyboard handling, camera/photo flow, gradient bg |
| `app/(admin)/(tabs)/sites.tsx` | 501 | View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, RefreshControl | - | yes | no | (inherited from parent layout) | no | yes | gradient bg, custom Animated (RN core, not reanimated), long list + heavy screen |
| `app/(admin)/(tabs)/staff.tsx` | 538 | View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, RefreshControl | - | yes | no | (inherited from parent layout) | no | yes | gradient bg, custom Animated (RN core, not reanimated), long list + heavy screen |
| `app/(admin)/clients/[id].tsx` | 874 | View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet | ScreenContainer | no | no | (inherited from parent layout) | no | yes | - |
| `app/(admin)/clients/invite.tsx` | 275 | View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet | ScreenContainer | no | no | (inherited from parent layout) | no | yes | - |
| `app/(admin)/sites/[id].tsx` | 1484 | View, Text, TextInput, TouchableOpacity, Pressable, FlatList, ScrollView, Modal, ActivityIndicator, StyleSheet | PaginationControls, ScreenContainer | no | no | (inherited from parent layout) | yes | yes | long list + heavy screen, modal |
| `app/(admin)/sites/create.tsx` | 492 | View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, Modal, ActivityIndicator, StyleSheet | ScreenContainer | no | no | (inherited from parent layout) | yes | yes | location/clock-in, long list + heavy screen, modal |
| `app/(admin)/staff/[id].tsx` | 690 | View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet | ScreenContainer | no | no | (inherited from parent layout) | no | yes | - |
| `app/(admin)/staff/invite.tsx` | 243 | View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet | ScreenContainer | no | no | (inherited from parent layout) | no | yes | - |

#### Staff screens (5)

| Path | Lines | RN primitives | Shared components | Gradient | SafeArea | Edges | Modal | TextInput | Risk flags |
|---|---|---|---|---|---|---|---|---|---|
| `app/(staff)/(tabs)/dashboard.tsx` | 455 | View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, RefreshControl | NotesModal, PhotoUploadModal, ProcessingOverlay | no | no | (inherited from parent layout) | no | yes | location/clock-in, long list + heavy screen |
| `app/(staff)/(tabs)/profile.tsx` | 299 | View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet, RefreshControl | - | no | no | (inherited from parent layout) | no | no | - |
| `app/(staff)/(tabs)/sites.tsx` | 239 | View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, RefreshControl | - | no | no | (inherited from parent layout) | no | yes | list |
| `app/(staff)/profile/edit.tsx` | 343 | View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet | ImageSourceSheet, ScreenContainer | no | no | (inherited from parent layout) | no | yes | camera/photo flow |
| `app/(staff)/site/[id].tsx` | 764 | View, Text, TouchableOpacity, FlatList, ScrollView, Image, ActivityIndicator, StyleSheet, RefreshControl | NotesPanel, PaginationControls, PhotoUploadModal, ProcessingOverlay, ScreenContainer | no | no | (inherited from parent layout) | no | no | location/clock-in, long list + heavy screen |

#### Client screens (6)

| Path | Lines | RN primitives | Shared components | Gradient | SafeArea | Edges | Modal | TextInput | Risk flags |
|---|---|---|---|---|---|---|---|---|---|
| `app/(client)/(tabs)/billing.tsx` | 543 | View, Text, TouchableOpacity, FlatList, ScrollView, Modal, ActivityIndicator, StyleSheet, RefreshControl | - | no | no | (inherited from parent layout) | yes | no | long list + heavy screen, modal |
| `app/(client)/(tabs)/dashboard.tsx` | 267 | View, Text, ScrollView, ActivityIndicator, StyleSheet, RefreshControl | - | no | no | (inherited from parent layout) | no | no | - |
| `app/(client)/(tabs)/profile.tsx` | 276 | View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet, RefreshControl | - | no | no | (inherited from parent layout) | no | no | - |
| `app/(client)/(tabs)/sites.tsx` | 221 | View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, RefreshControl | - | no | no | (inherited from parent layout) | no | yes | list |
| `app/(client)/profile/edit.tsx` | 395 | View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet | ImageSourceSheet, ScreenContainer | no | no | (inherited from parent layout) | no | yes | camera/photo flow |
| `app/(client)/site/[id].tsx` | 553 | View, Text, TouchableOpacity, FlatList, ScrollView, ActivityIndicator, StyleSheet, RefreshControl | NotesPanel, PaginationControls, PhotoThumb, ScreenContainer | no | no | (inherited from parent layout) | no | no | long list + heavy screen |

#### Shared screens (2)

| Path | Lines | RN primitives | Shared components | Gradient | SafeArea | Edges | Modal | TextInput | Risk flags |
|---|---|---|---|---|---|---|---|---|---|
| `app/index.tsx` | 18 | View, ActivityIndicator, StyleSheet | - | no | no | (inherited from parent layout) | no | no | - |
| `app/integrations/quickbooks.tsx` | 7 | - | - | no | no | (inherited from parent layout) | no | no | - |

Cross-cutting observations:
- **Headers are fully custom everywhere.** Every `Stack` disables `headerShown`; screens that need a "back" affordance render their own `BackButton` (see section D). There is no `expo-router` header, `Stack.Screen options`, or native header bar to reconcile with Paper's `Appbar`.
- **Gradients are admin-only.** `LinearGradient` appears only in the 5 admin `(tabs)` screens (list backgrounds + a "desktop card" wrapper in `settings.tsx`). Staff and client tab screens use flat `COLORS.background`. This is an existing inconsistency, not something the migration introduces, but it means the admin tab screens carry the most visual-parity risk.
- **SafeArea is layout-owned, not screen-owned.** Only the 7 `_layout.tsx` files and the two `app/auth/*` screens call `SafeAreaView`/`useSafeAreaInsets` directly (auth screens sit outside any role layout, so they must). All other screens rely on `ScreenContainer` (see section D) or the parent `_layout.tsx` for safe-area insets — no screen manages edges itself.
- **No screen uses `multiline` on a `TextInput`** except `NotesPanel` (a shared component, listed in section D).
- **Camera/photo flow** touches 4 screens (`(admin)/(tabs)/settings.tsx`, both `profile/edit.tsx` screens, and indirectly the staff dashboard + site screens via `PhotoUploadModal`), all going through the shared `ImageSourceSheet` bottom sheet.
- **Location/clock-in** touches 3 screens: `(admin)/sites/create.tsx` ("Use current location"), and the two staff clock-in surfaces (`(staff)/(tabs)/dashboard.tsx`, `(staff)/site/[id].tsx`).

## D. Shared component inventory

| Path | Renders | Props | Used by | Suggested Paper equivalent |
|---|---|---|---|---|
| `src/components/ScreenContainer.tsx` | `KeyboardAvoidingView` + `SafeAreaView` (bottom edge), flat `#1A1A1A` background | `children` | 10 screens (all admin invite/detail/create, both `profile/edit`, both `site/[id]`) | Keep custom. Paper has no keyboard/safe-area wrapper of its own; this stays as the app's screen shell regardless of migration, just re-themed via `PaperProvider`'s background. |
| `src/components/PaginationControls.tsx` | "Showing X–Y of Z", Previous/Next buttons, page text | `page`, `totalPages`, `total`, `limit`, `disabled?`, `onPageChange` | `(admin)/sites/[id].tsx`, `(client)/site/[id].tsx`, `(staff)/site/[id].tsx` | Rebuild on `DataTable.Pagination` — it's a closer match than hand-rolling, and gets keyboard/RTL affordances for free. |
| `src/components/ImageSourceSheet.tsx` | Bottom-sheet modal: Take Photo / Choose from Gallery / Cancel | `visible`, `onClose`, `onPicked`, `aspect?` | Admin settings, staff/client `profile/edit.tsx`, `PhotoUploadModal` | Rebuild on `Modal` + `Portal` from Paper, with `List.Item` rows for the two options. Paper has no native action-sheet primitive, so this stays a custom composition either way — just re-themed. |
| `src/components/PhotoUploadModal.tsx` | Full-screen `Modal`: before/after photo pairs, add-pair flow, `FlatList` | `visible`, `attendanceId`, `siteName?`, `onClose` | `(staff)/(tabs)/dashboard.tsx`, `(staff)/site/[id].tsx` | Keep custom shape (full-screen modal + FlatList), but swap internal buttons/cards for `Button`/`Card`. Highest-risk component to touch (see section H). |
| `src/components/NotesPanel.tsx` | Inline `FlatList` of notes + `TextInput` (multiline) + send button, `KeyboardAvoidingView` | `siteId`, `active?`, `role?` | `(client)/site/[id].tsx`, `(staff)/site/[id].tsx` | Rebuild the input row on `TextInput` (Paper) + `IconButton`; list rows on `List.Item` or a plain `Card`. |
| `src/components/NotesModal.tsx` | Full-screen `Modal` wrapper around `NotesPanel` | `visible`, `siteId`, `onClose` | `(staff)/(tabs)/dashboard.tsx` | Keep custom (thin wrapper); re-theme the header row (`Appbar.Header` would fit here well since it already behaves like a modal screen). |
| `src/components/ProcessingOverlay.tsx` | Full-screen dim overlay + spinner + "Processing..." text | `visible` | `(staff)/(tabs)/dashboard.tsx`, `(staff)/site/[id].tsx` | Trivial to rebuild on `ActivityIndicator` + `Portal`; low priority. |
| `src/components/PhotoThumb.tsx` | Signed-URL-resolving thumbnail `Image` | `path` | `(client)/site/[id].tsx` | Keep custom (data-fetching component, not a visual primitive); optionally wrap in Paper's `Avatar.Image`/`Card.Cover` for consistent corner radius. |
| `src/components/admin/StatCard.tsx` | Small stat tile: icon + label + value | `icon`, `label`, `value`, `style?` | `(admin)/(tabs)/dashboard.tsx`, `(client)/(tabs)/dashboard.tsx` | Good `Card` candidate — straightforward 1:1 swap. |
| `src/components/admin/AttendanceCard.tsx` | Attendance summary card (staff, site, clock in/out) | `record` | `(admin)/(tabs)/dashboard.tsx` only | Good `Card` candidate. **Note:** `(client)/site/[id].tsx` and `(staff)/site/[id].tsx` each define their *own* local function also named `AttendanceCard` (see below) — these are three separate implementations, not one shared component with three call sites. |
| `src/components/admin/AttendanceRow.tsx` | Compact attendance table row | `record` | `(admin)/(tabs)/dashboard.tsx` only | Candidate for `DataTable.Row`. |

**Duplication found (not currently "shared" but should be considered during migration):**
- **`BackButton`** is defined locally, identically, in 7 different screen files (`(admin)/clients/[id].tsx`, `(admin)/sites/[id].tsx`, `(admin)/staff/[id].tsx`, `(client)/profile/edit.tsx`, `(client)/site/[id].tsx`, `(staff)/profile/edit.tsx`, `(staff)/site/[id].tsx`). It's a one-line `Ionicons` + `Text` button. This is a good extraction target — pull it into `src/components/` and rebuild once on `Appbar.BackAction` or `Button icon="arrow-left"` rather than migrating it 7 times.
- **`AttendanceCard`** name collision described above: the real shared component in `src/components/admin/` vs. two independent local functions of the same name in the staff/client site-detail screens. These three should be reconciled into one component before or during the Paper pass, not migrated as three separate cards.

## E. Icons

Only one icon set is in use:

| Set | Import sites | `<Ionicons ...>` JSX usages |
|---|---|---|
| `Ionicons` (`@expo/vector-icons`) | 32 files | 73 |

No `Feather`, `MaterialCommunityIcons`, `MaterialIcons`, `FontAwesome`, `AntDesign`, `Entypo`, or `SimpleLineIcons` usage anywhere. This is a plus for the migration: Paper's default icon prop shape expects a render function, and `react-native-paper`'s docs favor `MaterialCommunityIcons` via `react-native-vector-icons`, but since everything here is already funneled through one set and one package (`@expo/vector-icons`), a single small adapter (`icon={(props) => <Ionicons name="..." {...props} />}`) covers the whole app rather than needing a set-by-set mapping.

## F. Hardcoded styling outside `theme.ts`

40 files contain raw hex colors and/or raw numeric `fontSize`/`borderRadius` literals instead of `COLORS`/`RADIUS` tokens (regex-counted, so treat as approximate — it will over-count things like `fontWeight: "700"` matches it deliberately excludes, but will miss e.g. `rgba(...)` used for opacity overlays, which are separately confirmed in 4 files):

- **167** raw hex color occurrences (`#RRGGBB`/`#RGB`) outside `theme.ts`
- **283** raw `fontSize: <number>` literals (no shared type-scale exists to compare against)
- **8** raw `borderRadius: <number>` literals bypassing `RADIUS`

Heaviest offenders (top 10 by hex count):

| File | hex | fontSize | borderRadius |
|---|---|---|---|
| `app/(admin)/sites/create.tsx` | 19 | 11 | 0 |
| `app/auth/login.tsx` | 15 | 7 | 2 |
| `app/auth/forgot-password.tsx` | 14 | 7 | 2 |
| `app/(admin)/(tabs)/settings.tsx` | 11 | 19 | 0 |
| `app/(admin)/clients/invite.tsx` | 11 | 6 | 0 |
| `app/(admin)/sites/[id].tsx` | 11 | 30 | 1 |
| `app/(admin)/staff/invite.tsx` | 11 | 6 | 0 |
| `app/(admin)/(tabs)/clients.tsx` | 6 | 13 | 0 |
| `app/(admin)/(tabs)/staff.tsx` | 6 | 12 | 0 |
| `src/components/NotesPanel.tsx` | 5 | 4 | 0 |

Full 40-file list (path only, sorted by hex count) is preserved for reference: both `app/auth/*` screens hardcode their entire palette locally (they don't import `theme.ts` at all — this was a deliberate recent change per the login/forgot-password screens' own dark-theme spec, not an oversight). The three admin invite/create screens and `sites/[id].tsx` are the next-heaviest, largely because they introduced one-off colors (`#2E2A1A` location button, `#242424`/`#2E1A1A` bottom-sheet colors) that were never added back into `theme.ts` as named tokens.

**Practical implication for migration**: a `theme.ts` → Paper `MD3Theme` mapping alone will not eliminate hardcoded colors — a follow-up "tokenize the strays" pass (turning e.g. `#2E2A1A` into a named `COLORS.locationBg` or a Paper theme color) is a separate, necessary step from the component-by-component Paper swap.

## G. Headers and navigation

- **Headers**: every `Stack` in every layout (`app/_layout.tsx`, all 3 role `_layout.tsx` files) sets `screenOptions={{ headerShown: false }}`. There is no native/router header anywhere in the app — 100% custom in-screen headers (title text + `BackButton`, see section D).
- **Tab bars**: each role has its own `(tabs)/_layout.tsx` (`(admin)`, `(staff)`, `(client)`). All three follow the same pattern:
  - `useWindowDimensions()` checks `width >= 768`.
  - **Desktop (≥768px)**: renders `<Slot />` directly — the parent role `_layout.tsx`'s `SidebarLayout` (a hand-built left sidebar with `TouchableOpacity` nav items) takes over instead of a tab bar.
  - **Mobile (<768px)**: renders `expo-router`'s `<Tabs>` with a custom `tabBarStyle` (dark surface, gold active tint, `COLORS.border` top border) sized to `60 + insets.bottom` so it clears the Android gesture bar.
  - Icons are `Ionicons`, active/inactive tint colors come from `theme.ts`.
- The desktop sidebar (`SidebarLayout`, defined once per role `_layout.tsx` — admin, staff, client each have their own near-identical copy) is itself a duplication candidate, separate from the Paper migration but worth flagging: `Drawer.Item`/`Drawer.Section` from Paper would be a natural fit if it's tackled.

## H. Proposed migration order and highest-risk screens

Suggested order (lowest-risk / highest-leverage first):

1. **Theme + `PaperProvider` setup** — define an `MD3DarkTheme` (and light variant, though `LIGHT_COLORS` currently has no consumer to preserve) from `theme.ts` tokens, wrap `app/_layout.tsx`. No screen changes yet; establishes the base every later step depends on.
2. **Shared, low-traffic components first**: `ProcessingOverlay`, `admin/StatCard`, `admin/AttendanceRow` — small, few call sites, easy to verify visually.
3. **Extract `BackButton` once**, migrate it to `Appbar.BackAction`/`Button`, then thread the extraction through its 7 call sites as those screens are migrated (don't do this as a 7-screen mechanical find/replace before the surrounding screen is otherwise touched — it'll create partial-migration diffs).
4. **Reconcile the three `AttendanceCard` implementations** into one shared `Card`-based component before migrating the screens that use them.
5. **List/detail screens without modals or camera**: `(admin)/staff/[id].tsx`, `(admin)/staff/invite.tsx`, `(admin)/clients/invite.tsx`, `(client)/(tabs)/dashboard.tsx`, `(client)/(tabs)/profile.tsx`, `(staff)/(tabs)/profile.tsx` — no camera/location/modal entanglement, good mid-difficulty practice screens.
6. **Auth screens** (`login.tsx`, `forgot-password.tsx`) — small and self-contained, but deliberately hardcode their own black theme outside `theme.ts`; migrating them means deciding whether that hardcoded palette becomes theme tokens or stays a one-off "auth is always black" override.
7. **Camera/photo screens** (`profile/edit.tsx` × 2, `(admin)/(tabs)/settings.tsx`, `ImageSourceSheet`, `PhotoUploadModal`) — do these together since they share one component.
8. **Clock-in/location screens** (`(staff)/(tabs)/dashboard.tsx`, `(staff)/site/[id].tsx`, `(admin)/sites/create.tsx`) — save for after the team has practice reps; these have live-state UI (processing overlays, distance/location text, active-attendance badges) that's easy to visually regress.
9. **Admin gradient list screens** (`clients.tsx`, `sites.tsx`, `staff.tsx`, `(tabs)/dashboard.tsx`) — the only screens using `LinearGradient` and custom `Animated` expand/collapse; decide up front whether Paper's `Card`/`List.Accordion` replaces the hand-rolled accordion animation or the animation is kept and only colors/typography move to Paper.
10. **Largest/most complex screens last**: `(admin)/sites/[id].tsx` (1484 lines, has a `Modal`, `Pressable`, pagination, tabs-within-a-screen) and `(client)/(tabs)/billing.tsx` (543 lines, has a `Modal`). Also `(admin)/clients/[id].tsx` (874 lines) and `(staff)/site/[id].tsx` (764 lines, clock-in + camera + notes + pagination all in one screen).
11. **Desktop `SidebarLayout` × 3** and the tab-bar `tabBarStyle` re-theme — do last since they're navigation chrome, not screen content, and changing them touches every role at once.

**Top risks, one line each:**

1. **`(admin)/sites/[id].tsx`** — 1484 lines, a `Modal`, `Pressable`, tabs-within-a-screen, and the shared `PaginationControls`; the single largest surface area for a Paper pass to regress something.
2. **`(staff)/site/[id].tsx`** and **`(staff)/(tabs)/dashboard.tsx`** — clock-in/clock-out is the app's core business function and both screens gate it behind live location + a full-screen `ProcessingOverlay`; any visual regression here has real operational cost (staff unable to tell if they're clocked in).
3. **`PhotoUploadModal` + `ImageSourceSheet`** — camera/gallery permission flows plus multipart upload state are easy to break subtly (e.g. a re-themed disabled/loading state that silently hides the upload spinner) and no automated test would catch it.
4. **Admin gradient/accordion screens (`clients.tsx`, `sites.tsx`, `staff.tsx`)** — the only screens with custom `Animated` (RN core) expand/collapse logic; Paper's `List.Accordion` behaves differently (its own animation, own hit-target sizing) so this is a rewrite, not a re-skin.
5. **Auth screens' hardcoded black palette** — `login.tsx`/`forgot-password.tsx` intentionally don't use `theme.ts`; migrating them without a decision on whether "auth is always pure black regardless of theme" becomes an explicit design rule risks either breaking that intentional look or leaving two theme systems (Paper theme + local hex) permanently side by side.
