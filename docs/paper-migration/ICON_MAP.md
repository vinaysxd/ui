# Icon migration map — Ionicons → MaterialCommunityIcons

Every proposed MaterialCommunityIcons (MCI) name below was checked against the actual glyph map shipped in this repo's `node_modules`:

```
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json
```

(7,448 glyphs total.) A name only appears in the "MCI equivalent" column if it exists in that file — nothing here is guessed from memory of the Material Design Icons set.

**Counting method.** PLAN.md's section E counted 73 raw `<Ionicons ...>` JSX tags in the source. That undercounts real usage: several places render `Ionicons` through a shared helper (`Row`/`StatCard`/tab-nav item components) with the icon name passed in as a prop, so one JSX tag renders many different icon instances depending on the caller. The table below instead counts every place in the source a *specific icon name* is referenced — literal `name="..."` props plus every literal resolved through a prop indirection — giving 38 distinct names across 106 total references. 13 of the original 73 tags use a non-literal `name={...}` expression (`item.icon`, a component's `icon` prop, or a ternary); all 13 are resolved to concrete literal names in this table except one dead one, noted below.

| Ionicons name | Usage count | MCI equivalent | Confidence | Where it comes from |
|---|---|---|---|---|
| `arrow-back` | 11 | `arrow-left` | High | Literal, `BackButton` copies across 7 screens + a few inline back arrows |
| `close-outline` | 9 | `close` | High | Literal — modal/sheet close buttons |
| `location-outline` | 7 | `map-marker-outline` | High | 1 literal (admin "Use Current Location" button) + 4 tab-nav icons (staff/client, sidebar + mobile tabs) + 2 `Row` call sites in `(admin)/sites/[id].tsx` |
| `search-outline` | 6 | `magnify` | High | Literal — list search bars |
| `briefcase-outline` | 5 | `briefcase-outline` | High | 1 literal + admin nav icon (×2 layouts) + admin dashboard `StatCard` + a `Row` call site |
| `business-outline` | 5 | `office-building-outline` | Medium | Admin nav icon (×2) + admin/client dashboard `StatCard`s + a `Row` call site |
| `chevron-down-outline` | 5 | `chevron-down` | Medium | Literal — dropdown/expand affordances |
| `person-outline` | 5 | `account-outline` | High | Staff/client nav icon (×2 each) + a `Row` call site |
| `home-outline` | 4 | `home-outline` | High | Staff/client nav icon (×2 each) |
| `chevron-forward` | 3 | `chevron-right` | High | Literal — list row disclosure |
| `image-outline` | 3 | `image-outline` | High | Literal — empty-photo states |
| `people-outline` | 3 | `account-group-outline` | High | Literal + admin nav icon (×2) |
| `person-add-outline` | 3 | `account-plus-outline` | High | Literal — invite buttons |
| `checkmark-done-outline` | 2 | `check-all` | Medium | Admin + client dashboard `StatCard` |
| `chevron-down` | 2 | `chevron-down` | High | `expanded ? "chevron-up" : "chevron-down"` ternary, 2 files |
| `chevron-up` | 2 | `chevron-up` | High | Same ternary, 2 files |
| `grid-outline` | 2 | `view-grid-outline` | High | Admin nav icon (×2 layouts) |
| `navigate-outline` | 2 | `compass-outline` | **Low** | `Row` call sites in `(admin)/sites/[id].tsx` (lat/long rows) — see flag below |
| `receipt-outline` | 2 | `receipt-text-outline` | **Low** | Client nav icon (×2 layouts) — see flag below |
| `settings-outline` | 2 | `cog-outline` | High | Admin nav icon (×2 layouts) |
| `trash-outline` | 2 | `trash-can-outline` | High | Literal — delete actions |
| `add` | 2 | `plus` | High | Literal |
| `camera-outline` | 2 | `camera-outline` | High | Literal — `ImageSourceSheet` |
| `checkmark` | 2 | `check` | High | Literal |
| `checkmark-circle` | 2 | `check-circle` | High | Literal |
| `add-outline` | 1 | `plus-outline` | High | Literal |
| `alert-circle-outline` | 1 | `alert-circle-outline` | High | Literal |
| `calendar-outline` | 1 | `calendar-outline` | High | Client dashboard `StatCard` |
| `call-outline` | 1 | `phone-outline` | High | `Row` call site |
| `cash-outline` | 1 | `cash` | **Low** | Literal — see flag below |
| `download-outline` | 1 | `download-outline` | High | Literal |
| `images-outline` | 1 | `image-multiple-outline` | High | Literal — `ImageSourceSheet` "Choose from Gallery" |
| `link-outline` | 1 | `link-variant` | Medium | Literal |
| `log-out-outline` | 1 | `logout` | High | Literal |
| `mail-outline` | 1 | `email-outline` | High | `Row` call site |
| `person-circle-outline` | 1 | `account-circle-outline` | High | `Row` call site |
| `send` | 1 | `send` | High | Literal — `NotesPanel` submit |
| `trending-up-outline` | 1 | `trending-up` | Medium | Client dashboard `StatCard` |

**Totals: 38 distinct Ionicons names, 106 references, 1 icon set (`Ionicons`) → 1 icon set (`MaterialCommunityIcons`), both via `@expo/vector-icons` — no new icon package needs installing.**

## Flagged as uncertain

These are existence-verified (the MCI glyph is real) but I'm not confident it's the closest *visual* match, since I compared names, not rendered glyphs:

1. **`navigate-outline` → `compass-outline`** (Low). Ionicons' `navigate` renders as a compass-needle/direction arrow. MCI has both `compass-outline` and `navigation-outline` (the latter looks more like a location-arrow/paper-plane in most MDI renders). I picked `compass-outline` as the closer visual analogue, but this should be eyeballed side-by-side before committing — it's used for the lat/long rows in `(admin)/sites/[id].tsx`, a low-traffic detail screen, so low risk either way.
2. **`receipt-outline` → `receipt-text-outline`** (Low). MCI's plain `receipt` glyph exists but has no `-outline` variant; `receipt-text-outline` is the closest outline-style alternative, but it reads more like a lined document than a torn receipt strip. This is the client role's "Billing" tab icon — worth a visual check since it's a persistent nav icon, not a one-off.
3. **`cash-outline` → `cash`** (Low). No outline-weight cash icon exists in MCI's set; `cash` is a filled/duotone-style glyph, so it'll look visually heavier than the rest of the (mostly outline-weight) icon set around it. Only 1 usage, low risk.
4. **`link-outline` → `link-variant`** (Medium). MCI has both `link` (single straight link) and `link-variant` (diagonal chain-link, closer to how most icon sets draw "link"). Picked `link-variant`; only 1 usage.
5. **`trending-up-outline` → `trending-up`** (Medium). No outline-weight trending arrow exists in MCI; using the one available glyph, which is filled. 1 usage (client dashboard stat card).
6. **`chevron-down-outline` → `chevron-down`** (Medium). MCI doesn't have separate outline/filled weights for directional chevrons — there's only one `chevron-down` glyph. Ionicons' `-outline` vs plain distinction (5 usages of `chevron-down-outline` as literal, plus 2 more of plain `chevron-down` from the ternary) collapses to the same MCI glyph either way, so this isn't a missing-icon problem, just a weight/style difference to expect.

## Not a mapping issue, but worth recording

- **`app/(admin)/(tabs)/settings.tsx`'s `SettingsRow` component** has an optional `icon?: keyof typeof Ionicons.glyphMap` prop and a live `<Ionicons name={icon} ... />` render — but neither of its two call sites in that file passes an `icon` value. It's dead code today (no icon actually renders there), so it isn't in the usage table above. When this component is migrated, its icon prop type should be re-typed against MCI's glyph map even though nothing currently exercises it.
