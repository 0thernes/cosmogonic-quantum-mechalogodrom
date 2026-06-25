# Security

Rules that must NEVER be broken. Always read this file.

## The copilot / server boundary (most important)

- The LLM copilot (`src/server/copilot.ts`, `ai-sandbox.ts`, `web-search.ts`, `src/ui/copilot.ts`) is a
  **read-only, secret-blind, prompt-injection-fenced docs helper**. It MUST NOT:
  - read or echo environment secrets / API keys (it is secret-blind by construction);
  - write or mutate deterministic sim state (it lives entirely outside the sim loop);
  - be treated as the source of the A-Life intelligence (the sim is non-LLM).
- All cross-boundary input (network, copilot, web search, user input) is UNTRUSTED. Sanitize
  (DOMPurify is pinned for this), validate, and never `eval` it. Treat injected text as hostile.

## Supply chain & CI

- GitHub Actions are **SHA-pinned**; keep them pinned. `persist-credentials: false` everywhere.
  Least-privilege `permissions:` per job. Do not loosen these.
- CI runs CodeQL `security-extended`, dependency-review (fail on high), and `bun audit`. Releases emit
  a CycloneDX SBOM + SLSA build-provenance attestation — do not remove these steps.
- Frozen lockfile installs. Do not commit unpinned or unreviewed new dependencies.

## Secrets

- No secrets in the repo, in tests, in logs, or in committed config. The harvest folder path
  (`Z:\…`) is a local machine path, not a secret, but do not hard-code other machine-specific paths
  into shipped code.

## Determinism as an integrity property

- Determinism is also a security/integrity guarantee: a run is fully replayable and auditable from its
  seed. Do not introduce non-determinism into `src/sim/**` (no clocks, no unseeded RNG, no
  iteration-order hazards) — it would break both reproducibility and the audit trail.
