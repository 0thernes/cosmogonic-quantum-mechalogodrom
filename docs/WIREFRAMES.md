# Wireframes & Visual Spec

The UI is chrome around a fullscreen WebGL canvas: glassmorphic fixed panels
that collapse, a bottom toolbar, and overlay text that fades. Layout anchors
are ported 1:1 from the legacy CSS; the audit panel (`#aP`) is new in the
port.

## Desktop (hover-capable pointers — joystick hidden)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ ┌ TELEMETRY ──────────── ▾ ┐    ( AETHON — stokes the chaos )    ┌ CONTROL ───── ▾ ┐│
│ │ ENTITIES        912/1000 │           #nm toast, 3 s fade       │       [W ↑]     ││
│ │ ▁▂▃▅▆▇█▇▆▅ #g0 sparkline │                                     │ [A ←][S ↓][D →] ││
│ │ CHAOS                3.2 │                                     │ [Q Up]    [E Dn]││
│ │ ▁▁▂▃▃▄▅▅▆▆ #g1 sparkline │                                     │ [Z Rl] [X Rr]   ││
│ │ ENERGY                48 │                                     │ [R Tu] [F Td]   ││
│ │ ▂▃▄▅▅▄▃▃▂▂ #g2 sparkline │        f u l l s c r e e n          │ [C Yl] [V Yr]   ││
│ │ CONNECTOME          1841 │                                     │ ┌─────────────┐ ││
│ │ ▃▄▅▆▇▇▆▅▄▃ #g3 sparkline │      W e b G L   c a n v a s        │ │ SPLIT  BURST│ ││
│ │ MORPHS            64/100 │                                     │ │ MUTATE CHA+ │ ││
│ │ ALGORITHM      HEAP SIFT │                                     │ └─────────────┘ ││
│ │ QUANTUM            0.041 │       M O N O L I T H  A R R A Y    └─────────────────┘│
│ │ SONG            ETHEREAL │        #sec sector title, centered                     │
│ │ MUTATIONS           2733 │        at 42% height, 2.5 s fade                       │
│ │ TRIBES                 5 │                                                        │
│ │ TREND             +2.4/m │                                                        │
│ │ QBIT-S              0.87 │                                                        │
│ │ ── environment ───────── │                                                        │
│ │ WEATHER           AURORA │                                     ┌ AUDIT ──────── ▾ ┐
│ │ WIND                 2.3 │                                     │ 1. weather AURORA││
│ │ TEMP                -10C │                                     │ 2. mutate  x912  ││
│ │ SHOGGOTHS              3 │                                     │ 3. split         ││
│ │ PUPPETEERS             3 │                                     │ (hx-get /api/    ││
│ └──────────────────────────┘                                     │  audit every 5s) ││
│ ┌ #alg ───────────────┐                                          └──────────────────┘
│ │ HEAP SIFT           │                                                              │
│ │ step 4812 ⇄         │  ┌──────────────────── #bar toolbar ─────────────────────┐   │
│ │ VEL-KORAH (#lore)   │  │ [♫][Song][SFX][Fx][⟳][⏱][Wire][View][Algo][☁][☠][Lab] │   │
│ └─────────────────────┘  └────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## Mobile (coarse pointer / no hover — joystick shown)

```
┌──────────────────────────────────┐
│┌ TELEMETRY ▾ ┐  (toast)  ┌ CTRL ▾┐│
││ ENTITIES    │           │ [W↑]  ││
││     589/650 │           │[A][S] ││
││ ▁▃▅▇ #g0    │           │   [D] ││
││ CHAOS   4.1 │           │[Q][E] ││
││ ▂▃▄▅ #g1    │           │[Z][X] ││
││ ENERGY   31 │           │[R][F] ││
││ ▃▄▄▃ #g2    │  WebGL    │[C][V] ││
││ LINKS  1204 │  canvas   │ SPLIT ││
││ ▅▆▇█ #g3    │           │ BURST ││
││ ...         │           │ MUTATE││
│└─────────────┘           │ CHAOS+││
│                          └───────┘│
│   G E N E S I S   F I E L D       │
│        (#sec, centered)           │
│ ┌ #alg ────┐                      │
│ │ COMB     │                      │
│ │ SWEEP    │                      │
│ │ step 217 │                      │
│ │ VEL-KORAH│                      │
│ └──────────┘                      │
│  ╭────────╮                       │
│  │  #jP   │   ┌─ #bar ─────────┐  │
│  │  (#jK) │   │[♫][Song][SFX]  │  │
│  │   ◉    │   │[Fx][⟳][⏱][Wire]│  │
│  ╰────────╯   │[View][Algo][☁] │  │
│   joystick    │[☠][Lab] (wraps)│  │
│               └────────────────┘  │
│        ▒▒ safe-area-inset ▒▒      │
└──────────────────────────────────┘
```

## Placement table

| Region          | id     | Anchor                                                                                             | Size                                                       |
| --------------- | ------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Telemetry panel | `#sP`  | top-left: `left: 6px; top: 6px + safe-area-top`                                                    | `clamp(150px, 24vw, 220px)`; body max-height `65vh − 40px` |
| Control panel   | `#cP`  | top-right                                                                                          | `clamp(130px, 21vw, 175px)`                                |
| Toolbar         | `#bar` | bottom-center: `left: 50%; translateX(-50%); bottom: 6px + safe-area-bottom`                       | content width, wraps, max `100vw − 12px`                   |
| Algo card       | `#alg` | left; desktop `bottom: 44px + sab`; mobile above joystick (`bottom: 140px + sab`, `124px` ≤ 480px) | max-width `clamp(115px, 26vw, 185px)`                      |
| Joystick        | `#joy` | bottom-left, **touch devices only** (`hover:none`/`pointer:coarse`)                                | pad 88px / knob 30px (74/26 ≤ 480px)                       |
| Sector title    | `#sec` | centered at 42% viewport height, pointer-events none                                               | `clamp(14px, 4vw, 28px)`                                   |
| Puppet toast    | `#nm`  | top-center pill, pointer-events none                                                               | content                                                    |
| Audit panel     | `#aP`  | bottom-right (new in port), collapsible like `#sP`/`#cP`                                           | matches `#cP` width                                        |

Panels share the glass treatment: translucent void background (`bg-void/90`),
1px translucent cyan border, `rounded-panel` (10px), `backdrop-blur-xl`
(24px) + `saturate(1.5)`, `shadow-panel`. Headers (`[data-panel-toggle]`)
toggle the parent's `col` class — collapsed panels hide the body and rotate
the chevron −90°.

## Type scale

Two families only: **Inter Variable** for UI labels, **JetBrains Mono** for
anything numeric. The legacy prototype used 6–9px text; the port raises the
scale for legibility while keeping the same hierarchy.

| Token / utility | Font / weight        | Size                     | Tracking / case                           | Used for                                             |
| --------------- | -------------------- | ------------------------ | ----------------------------------------- | ---------------------------------------------------- |
| `text-4xs`      | Inter 300–400        | 8px                      | uppercase, wide tracking                  | telemetry keys, env rows, control-pad captions, lore |
| `text-3xs`      | Inter / Mono         | 9px                      | uppercase (ui) / tabular (mono)           | toolbar captions, algo name + step, audit entries    |
| `text-2xs`      | Inter 600 / Mono 600 | 10px                     | uppercase headers / `tabular-nums` values | panel headers, toast `#nm`, telemetry values         |
| `text-xs`       | (Tailwind std)       | 12px                     | —                                         | panel chevrons                                       |
| `text-display`  | Inter 300            | `clamp(14px, 4vw, 28px)` | uppercase, `tracking-display` clamp       | sector title `#sec`                                  |

Rules:

- **All numerals render in JetBrains Mono with `font-variant-numeric:
tabular-nums`** — telemetry values must not jitter horizontally as digits
  change at 7.5 updates/sec.
- Labels are always uppercase Inter with wide tracking; values never are.
- Fonts are self-hosted via Fontsource (`@fontsource-variable/inter`,
  `@fontsource/jetbrains-mono`) — no Google Fonts CDN request.

## Color tokens

Defined via `@theme static` in `src/styles/app.css`. The full token registry
(semantic danger family, ink family, control-pad `ctrl-*` blues, sim-action
`sim-*` oranges, the 8-hue `tribe-*` palette, radii, shadows, motion) is
documented in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — the core three:

| Token            | Value     | Usage                                          |
| ---------------- | --------- | ---------------------------------------------- |
| `--color-void`   | `#030612` | page/scene background, panel base color        |
| `--color-accent` | `#0ef`    | panel headers, accents, focus rings, nav links |
| `--color-warn`   | `#fa0`    | telemetry keys (amber at ~70% alpha), warnings |

Derived surface treatments (matching the legacy feel):

| Surface             | Treatment                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| Panel glass         | `rgba(3,6,18,0.93)` + `backdrop-blur(12px) saturate(1.4)` + inset top highlight `rgba(255,255,255,0.03)`  |
| Panel border        | `rgba(0,160,240,0.15)` (cyan)                                                                             |
| Toolbar buttons     | green tint — border `rgba(0,230,100,0.12)`, text `#8ea`, active `rgba(0,255,100,0.2)`                     |
| Danger (apocalypse) | red tint — border `rgba(255,50,50,0.2)`, text `#f88`                                                      |
| Algo card           | violet tint — border `rgba(160,100,255,0.12)`, step text `#c8b0ff`                                        |
| Puppet toast        | orange pill — `rgba(255,100,0,0.06)` bg, border `rgba(255,150,0,0.1)`                                     |
| Control buttons     | blue tint — `rgba(0,80,160,0.1)` bg, text `#8bf`; sim buttons (`SPLIT`/`BURST`/...) orange variant `#fa8` |
| Body text           | `#b8c8e8`                                                                                                 |
| Telemetry values    | `#eef`                                                                                                    |

Sparkline strokes (canvas, not CSS): entities `rgba(0,200,255,1)`, chaos
`rgba(255,80,0,1)`, energy `rgba(100,255,100,1)`, connectome
`rgba(255,255,0,1)` — each with a 8%-alpha area fill on `rgba(0,0,8,0.85)`.

## Spacing & interaction

- Global gap `6px`; panel radius `10px`; safe-area insets via
  `env(safe-area-inset-top/bottom)` (toolbar and joystick respect the bottom
  inset).
- Buttons: control pad 28px tall (24px ≤ 480px, 30px ≥ 1200px); toolbar
  buttons min-height 26px (22px ≤ 480px). Touch targets stay ≥ 24px even at
  the smallest breakpoint.
- Every icon-only toolbar button carries `aria-label` **and** `title`
  (Known Bug 7): ♫ "Toggle music", ⟳ "Reset simulation", ⏱ "Cycle time
  scale", ☁ "Cycle weather", ☠ "Apocalypse".
- Sparkline canvases: 100% width × 24px (18px ≤ 480px), HiDPI-aware (backing
  store at 2× CSS size).
- `#sec` and `#nm` are `pointer-events: none` overlays; opacity transitions
  1.2s / 0.8s, auto-hide after 2.5s / 3s.
- Breakpoints: ≤ 480px (compact), 481–768px (mid), ≥ 1200px (wide),
  height ≤ 450px (squat — panel bodies capped at ~30vh). Joystick visibility
  flips on `(hover:none), (pointer:coarse)`.
- **Keyboard focus**: every `button` and `a` shows a 2px `--color-accent`
  outline (offset 2px) on `:focus-visible` only — pointer taps stay clean.
- **Reduced motion**: `prefers-reduced-motion: reduce` damps all transition
  and animation durations to 1ms (fades become snaps); the 2.5s/3s hold
  timers in `ui/hud.ts` still govern visibility.
- V2 surfaces: telemetry rows `#v9` TRIBES / `#v10` TREND (signed `+x.x/m`)
  / `#v11` QBIT-S sit under MUTATIONS; the `#lore` sub-sector line renders
  under `#a-step` in `#alg`; `[Lab]` in `#bar` is an accent-family nav link
  to `/lab` (aria-labeled), visually distinct from action buttons.
