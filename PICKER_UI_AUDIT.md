# PICKER_UI_AUDIT.md

Source of truth: **`_source/Selorg Picker Pro (Standalone).html`** — a self‑extracting
"bundled page". Its real content is a Claude **Design Canvas** document:

| Part | Location | Role |
|------|----------|------|
| `<x-dc>` template | `script[type="__bundler/template"]` → `_source/extracted/template.html` lines 9–1373 | The view. Custom template language (`sc-if`, `sc-for`, `{{ }}`, `sc-camel-on-*`). |
| `Component extends DCLogic` | `<script data-dc-script>` → `template.html` lines 1374–1969 | All state, data, handlers, validation, icons. |
| dc-runtime | `support.js` (identical to bundled `45370294…js`) | Renders the template against the logic. Not app code. |
| React / ReactDOM 18.3.1 | bundled `017b59e7…js`, `f85b672b…js` | dc-runtime dependency. |
| Assets | 1 image (`0a666212…jpg` = Selorg logo), JetBrains Mono + Plus Jakarta Sans woff2 | `_source/extracted/assets/` |

`_source/uploads/` contains the backend spec (`01`–`18`, `MASTER_ARCHITECTURE.md`) and an
**older Expo prototype** (`picker-app-v2-main`). `BACKEND_ALIGNMENT.md` maps the prototype to the API.
These informed the service layer only — the HTML is the visual truth.

## What this app is

A **picker workforce app** — onboarding, shift attendance, performance, payouts, profile, support.
**There is no handheld picking / barcode‑scanner / order‑detail UI** (that is a separate HHD app,
per `04-picker-workflow.md` and `BACKEND_ALIGNMENT.md`). The home screen shows order **counts only**.
Phase‑4 items that do not exist in the HTML (scanner screen, scan result, item‑replacement,
order completion, product list, sorting) are therefore **intentionally not built**.

## Design system (extracted verbatim from inline styles)

### Colour
| Token | Hex | Use |
|-------|-----|-----|
| green/600 (primary) | `#1E8E43` | buttons, active states, login header, links |
| green/700 | `#14672F` | link hover, dark green text |
| green/900 (ink card) | `#123B22` | balance card, profile card, chat header, device card |
| green/deep | `#0E4A22` | headings on tinted green |
| green/050 tint | `#EAF5EC` | success pill bg, selected radio bg, icon chips |
| green/soft | `#EFF3EE` / `#F6F9F5` / `#F6F8F5` | neutral chip / input fill |
| mint accent | `#8CE0A3` | status dots on dark card |
| teal | `#0E8F8A` / bg `#E0F2F0` | "orders synced" icon, secondary flows |
| amber | `#E8A317` / text `#8A6400` / `#7A5600` / bg `#FCF2DC` / border `#F0DCA6` | pending, half‑day, warnings, offline banner |
| red | `#D64545` / `#D64545` / bg `#FBE9E9` / border `#F0D2D2` `#F3D6D6` | errors, destructive, absent, blocked |
| gold | `#F2C94C` | money numerals on dark card |
| app bg | `#F3F6F2` (screen) / `#E7ECE6` (stage) / `#F0F4EF` (chat) | |
| surface | `#FFFFFF`, border `#E4EAE5` / `#EEF2ED` / `#F1F4F0` | cards, rows |
| ink | `#16231B` (text), `#5E6E63` (secondary), `#8A9990` / `#9AA89E` (muted), `#C3CFC6` (disabled) | |
| input border | `#D8E0D8` idle, `#1E8E43` focus, `#D64545` error | |
| disabled button | `#B7C9BC` / `#B7C9BC` | |
| device sheet phone frame | `#0E1A12`, inner `#23372A` | (stage chrome only — not reproduced natively) |

### Type — `Plus Jakarta Sans` (UI), `JetBrains Mono` (numerals: timers, money, OTP, account #)
Sizes seen: 9.5, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 30, 34, 38 px.
Weights: 500, 600, 700, 800. Letter‑spacing: -.4/-.2 (headings), .4/.5/.6 (overlines/uppercase).

### Radius
`6 7 8 9 10 11 12 13 14 16 18 20 22 24 26` px; pills `20/24`; circles `50%`; sheet top `26`.

### Spacing
4‑pt-ish: gaps `6 7 8 9 10 11 12 13 14 16 18 20 24`; screen padding `16` or `20–22`; card padding `14–24`.

### Elevation
Cards: `0 2px 10px rgba(16,40,24,.04)`. Toast: `0 12px 32px rgba(0,0,0,.3)`. Login logo: `0 10px 26px rgba(0,0,0,.28)`.

### Motion / keyframes
`spin` 1.2–1.6s (loaders), `pulse` 1.4s (live dot), `sheetUp` .22–.28s (sheets/dialogs),
`shimmer` 1.3s (`.skel` skeletons), `blink` 1s staggered (chat typing dots).

### Iconography
All icons are inline SVG built by `Component.icon(name,…)` + ad‑hoc SVG. 24×24 grid, 1.6–2.4 stroke,
round caps/joins. Set: home, cal, target, user, package, zap, trophy, clock, card, wallet, file,
settings, phone, briefcase, alert, book, check, dollar, box, bell, mail, chat, shield, logout,
chevron‑left (back), chevron‑right, plus, upload, pin/location, camera, face, fingerprint, play, pause,
close(✕), send, arrow‑up‑right. Reproduced 1:1 in `src/components/icons/Icon.tsx`.

## Global chrome (persistent across screens)

1. **OS status bar** (9:41, signal, battery, notch) — tint switches: green on `login`, light elsewhere.
2. **Offline banner** — amber, "Offline — 3 actions queued…", shown when `dataState==='offline'`.
3. **Bottom tab bar** — shown only on `home/attendance/performance/profile`; 4 tabs (Home, Attendance, Performance, Profile) icon+label, active `#1E8E43`/weight 800.
4. **Toast** — dark pill w/ green check, auto‑dismiss 2.2 s.
5. **Overlays** (absolute, above everything): shift‑verify sheet, logout dialog, device‑issue sheet, training‑video modal, collect‑device sheet, withdraw sheet.

## Data‑state matrix (`dataState`: normal | loading | empty | error | offline)

| Screen | loading | empty | error | offline |
|--------|:---:|:---:|:---:|:---:|
| home | skeletons (150/78/96/2×120) | – | "Couldn't load dashboard" + Retry | banner + normal |
| performance | 4 tile + bar skeletons | – | – | banner |
| attendance ▸ OT | – | "No overtime hours recorded" | – | – |
| payouts | – | "No transaction history yet" | – | – |
| notifications | – | "You're all caught up" | – | – |

(The other 15 screens render only their normal state.)

See `PICKER_SCREEN_MATRIX.md` for the per‑screen element inventory and
`PICKER_INTERACTION_AUDIT.md` for every handler.
