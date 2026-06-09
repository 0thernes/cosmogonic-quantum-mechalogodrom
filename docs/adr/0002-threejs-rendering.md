# ADR 0002 — three.js 0.184 ES modules for rendering

- Status: Accepted
- Date: 2026-06-09

## Context

The legacy file loads **three.js r128 (2021)** as a global script from a CDN.
The scene is heavily three-shaped: ~41 shared `BufferGeometry` instances, up
to 1,000 `MeshStandardMaterial` meshes, two `Points` clouds (stars, quantum),
`LineSegments` for the connectome and Shoggoth tendrils, `CatmullRomCurve3`
tube pipelines, ACES filmic tone mapping, and `FogExp2`.

Between r128 and 0.184 the API drifted materially: `BufferAttribute.
updateRange` was **removed** (replaced by `clearUpdateRanges()` /
`addUpdateRange()`), output color management changed
(`outputColorSpace` defaults to sRGB), and geometry/material internals moved.
Staying on r128 would mean no TypeScript types worth having and a CDN
dependency; rewriting away from three would forfeit the faithful port.

## Decision

Use **`three@0.184` from npm as ES modules** with `@types/three`:

- `import * as THREE from 'three'` everywhere; no globals, no CDN.
- Keep the modern defaults: `outputColorSpace` stays at the 0.184 default;
  visual parity is tuned through the ported constants, not by resurrecting
  legacy color management.
- Port the legacy renderer constants verbatim: ACES filmic tone mapping,
  exposure 1.15, `FogExp2(0x020310, 0.003)`, camera 68° / 0.1–900 at
  (0, 25, 55), DPR capped at 1.25 (mobile) / 2 (desktop), shadows per quality
  profile.
- Partial GPU uploads use the 0.184 API:
  `attr.clearUpdateRanges(); attr.addUpdateRange(0, links * 6);` before
  `needsUpdate = true` (this is also the Known Bug 13 fix — the legacy code
  re-uploaded the full 4,000-segment connectome buffers every update).
- Preserve the legacy resource discipline: geometries are shared and **never
  disposed**; materials are per-entity and **always disposed** on entity
  death; remorphing swaps geometry references instead of recreating meshes.

## Consequences

**Positive**

- Full strict typing of the entire scene graph; `Entity` is a typed
  `THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>` carrying
  typed `userData`.
- Partial buffer uploads cut connectome upload bandwidth proportionally to
  live links (often < 10% of the buffer).
- Tree-shaken bundle instead of the full r128 CDN payload.

**Negative / accepted risks**

- r128 → 0.184 is a 56-release jump; subtle shading differences from color
  management changes are possible. Mitigation: side-by-side eyeballing
  against `legacy/` and keeping every tunable constant identical.
- Deprecated-API muscle memory is a hazard — `updateRange` assignments
  compile nowhere but reviewers must watch for other r128 idioms; the
  contract bans them explicitly.
- three minor releases routinely break: the version is pinned via
  `bun.lock`, upgrades go through `bun run check` plus a visual pass.
