<!-- reviewed: 2026-07-02 | mega-audit round 3 PM-artifact gap-fill | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Dependency Manifest & Supply-Chain Policy

**Living document.** The last of the six PM artifacts (PRD · Risk Register · Test Strategy ·
Performance Targets · Security Architecture · this). One page: what the repo depends on, the rules for
adding a dependency, and the supply-chain gates that already run. The machine-readable SBOM is generated
by [`scripts/sbom.ts`](../scripts/sbom.ts) (`bun run sbom`) — **deterministic by design** (no timestamp,
sorted components: same lockfile ⇒ byte-identical CycloneDX 1.5 JSON).

## 1 · Dependency inventory (small on purpose)

**Runtime (12):** `three` (rendering; the only large one), `htmx.org`, `mermaid` (docs diagrams),
`simple-statistics`, `simplex-noise`, `d3-delaunay`, `graphology` + `-communities-louvain` + `-metrics`
(connectome analysis), `@noble/hashes`, `@fontsource-variable/inter`, `@fontsource/jetbrains-mono`.

**Dev (11):** `typescript`, `oxlint`, `prettier` (+ tailwind plugin), `tailwindcss` + bun plugin,
`mitata` (bench), `@types/*`. **Override (1):** `dompurify ≥ 3.4.11` (transitive, via mermaid — pinned
past a known sanitizer advisory).

Everything cognition-critical (quantum, Clifford, AD, spin-glass, irrep, RNG) is **first-party source**
— ported, credited MIT reimplementations (see [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md)),
never binary vendored, never a runtime network dependency. The scientific core cannot be supply-chain
attacked through npm.

## 2 · Gates that already run (verified 2026-07-02)

| Gate                                  | Where                                                                                   | Blocking?                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------- |
| Frozen lockfile (`--frozen-lockfile`) | ci.yml every job + REPRODUCE procedure                                                  | **Yes** — drift fails install               |
| `bun audit` (full tree)               | ci.yml                                                                                  | Advisory; HIGH/CRITICAL isolated for review |
| Dependency-review action              | PR trigger (dead by design — no-PR law)                                                 | n/a                                         |
| **SBOM published per release**        | release.yml:113 — `bun run sbom > cqm-<tag>-sbom.cdx.json`, uploaded as a release asset | Yes, on every tag                           |
| **SLSA build-provenance attestation** | release.yml (Sigstore OIDC, `attestations: write`)                                      | Yes, on every tag                           |
| Action pinning                        | workflows pin `uses:` to full SHAs                                                      | Yes                                         |

(The 2026-07-01 scorecard criticized "SBOM not published to releases" — that was **stale**: the release
workflow already generates and uploads it, with provenance. Corrected here and in the scorecard.)

## 3 · Policy for adding a dependency

1. **Default no.** Prefer a first-party port (the Tsotchke pattern) — especially for anything in the
   deterministic sim path, where a dependency's internal `Math.random`/clock use would violate the
   determinism law invisibly.
2. If a dep is genuinely warranted: MIT/BSD/Apache-2 licensed (no GPL into the proprietary bundle — see
   the license gate in [tsotchke-corpus notes](./TSOTCHKE-INTEGRATION-MAP-2026-06-26.md)), actively
   maintained, no post-install scripts, and reviewed at the _lockfile diff_ level before commit.
3. Bumps go straight to `main` (no dependabot; the no-PR law) after a green `bun run check`.
4. Any new transitive advisory: pin via `overrides` (the `dompurify` pattern) rather than waiting on the
   direct dependency.

## 4 · Residual risks (tracked in [RISK-REGISTER-2026-07-02.md](./RISK-REGISTER-2026-07-02.md))

- `bun audit` is advisory, not blocking — acceptable while the tree is this small; revisit if the
  runtime dep count grows past ~20.
- `three` is the one large surface (≈600 kB); its upgrade cadence is handled by running the full visual
  and golden-hash suites on every bump (the `RGBFormat`-removal incident is the cautionary tale — verify
  renderer behavior in-browser, not just the gate).
