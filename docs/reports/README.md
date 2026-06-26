# Reports — frozen historical archive

These dated files are **point-in-time worldline snapshots**. They are frozen: read them for
history, but **do not add new standalone report files here**.

- New audits / reviews / fix-passes → append a dated entry to [`../AUDIT-LOG.md`](../AUDIT-LOG.md)
  (the single centralized log, indexed there).
- Shipped changes → [`../../CHANGELOG.md`](../../CHANGELOG.md).
- Living status → [`../NHSI-PROGRESS-DASHBOARD.md`](../NHSI-PROGRESS-DASHBOARD.md).

Live facts (version, test/coverage receipts) are not hand-edited anywhere — they are propagated
from the single sources of truth (`package.json`, `scripts/canonical-receipts.ts`) by
`scripts/sync-surfaces.ts` and policed by `bun run sync:check` in the gate.
