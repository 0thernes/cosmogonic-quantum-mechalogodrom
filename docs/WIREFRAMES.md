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
│ └─────────────────────┘  │ [♫][Song][SFX][Fx][⟳][⏱][Wire][View][Algo][☁][☠]      │   │
│                          └────────────────────────────────────────────────────────┘  │
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
│ └──────────┘                      │
│  ╭────────╮                       │
│  │  #jP   │   ┌─ #bar ─────────┐  │
│  │  (#jK) │   │[♫][Song][SFX]  │  │
│  │   ◉    │   │[Fx][⟳][⏱][Wire]│  │
│  ╰────────╯   │[View][Algo][☁] │  │
│   joystick    │[☠]  (wraps)    │  │
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

Panels share the `.P` treatment: translucent void background, 1px translucent
cyan border, `border-radius: 10px`, `backdrop-blur(12px) saturate(1.4)`.
Headers (`[data-panel-toggle]`) toggle the parent's `col` class — collapsed
panels hide the body and rotate the chevron −90°.

## Type scale

Two families only: **Inter Variable** for UI labels, **JetBrains Mono** for
anything numeric. The legacy prototype used 6–9px text; the port raises the
scale for legibility while keeping the same hierarchy.

| Token      | Font / weight      | Size                     | Tracking / case                               | Used for                                          |
| ---------- | ------------------ | ------------------------ | --------------------------------------------- | ------------------------------------------------- |
| `label-xs` | Inter 300–400      | 10px                     | uppercase, tracking-widest                    | telemetry keys (`.sk`), env rows, button captions |
| `label-sm` | Inter 600          | 11px                     | uppercase, 2px tracking                       | panel headers (`.Ph h3`), toast `#nm`, algo name  |
| `value-sm` | JetBrains Mono 600 | 12px                     | `tabular-nums`                                | telemetry values (`.sv`), algo step counter       |
| `value-md` | JetBrains Mono 400 | 14px                     | `tabular-nums`                                | audit entries, larger readouts                    |
| `display`  | Inter 300          | `clamp(14px, 4vw, 28px)` | uppercase, `clamp(4px, 1.5vw, 14px)` tracking | sector title `#sec`                               |

Rules:

- **All numerals render in JetBrains Mono with `font-variant-numeric:
tabular-nums`** — telemetry values must not jitter horizontally as digits
  change at 7.5 updates/sec.
- Labels are always uppercase Inter with wide tracking; values never are.
- Fonts are self-hosted via Fontsource (`@fontsource-variable/inter`,
  `@fontsource/jetbrains-mono`) — no Google Fonts CDN request.

## Color tokens

Defined via `@theme` in `src/styles/app.css`:

| Token            | Value     | Usage                                          |
| ---------------- | --------- | ---------------------------------------------- |
| `--color-void`   | `#030612` | page/scene background, panel base color        |
| `--color-accent` | `#0ef`    | panel headers, accents, focus rings            |
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
