<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Tsotchke relicense drafts — drop-in files to unblock corpus integration

Ready-to-commit license/notice files for the 4 **relicensable** Tsotchke repos, so Cosmogonic can port
them in. Provenance-checked 2026-06-21 (see `../TSOTCHKE-INTEGRATION-MAP-2026-06-26.md` → "Provenance & relicensing
risk"). **Not legal advice — confirm chain-of-title first.**

## Before you commit any LICENSE: confirm 2 non-code facts

1. **Concordia (university) IP — for PINN + PIMC.** The author email is `@concordia.ca`. If these were
   written as personal work (not university coursework/research/employment), tsotchke owns them outright →
   safe to MIT. If there's any chance they were university work, get a one-line IP release first.
2. **Author assignment — for ulg + logo-lab.** These were authored by **ubernaut (Collin Schroeder)**, not
   0thernes. Tsotchke-Corporation owning the GitHub repo is NOT the same as owning Collin's copyright. Get a
   short written copyright-assignment (or confirm a contractor/employment agreement already covers it).

## Drop-in plan (per repo)

| Repo                            | File to add                                                      | Copyright line                                 |
| ------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| `tsotchke/PINN`                 | `LICENSE` ← `MIT-LICENSE.txt`                                    | `Copyright (c) 2024 tsotchke`                  |
| `tsotchke/PIMC`                 | `LICENSE` ← `MIT-LICENSE.txt`                                    | `Copyright (c) 2024 tsotchke`                  |
| `Tsotchke-Corporation/ulg`      | `LICENSE` ← `MIT-LICENSE.txt`                                    | `Copyright (c) 2024-2026 Tsotchke Corporation` |
| `Tsotchke-Corporation/logo-lab` | `LICENSE` ← `MIT-LICENSE.txt` + `NOTICE` ← `NOTICE-logo-lab.txt` | `Copyright (c) 2024-2026 Tsotchke Corporation` |

> **Do NOT** add a permissive LICENSE to **quantum-quake** — it is **GPL-2.0** (id Software / QuakeSpasm) and
> is not yours to relicense. Keep it out of any proprietary build.

Edit the `<COPYRIGHT>` line in `MIT-LICENSE.txt` per the table, drop it into each repo root, push. Then tell
me and I wire them: **ulg → world law-graph (rules-as-cognition)**, **logo-lab → procedural morphogenesis**,
**PINN/PIMC → world/quantum-path physics**.
