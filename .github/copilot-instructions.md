<!-- reviewed: 2026-06-27 | repo-wide consistency + correctness audit; canonical facts in docs/VERIFICATION-ANALYTICAL-DATA.md -->

<!-- hacklm-memory:start -->

## Memory-Augmented Context

Read memory files on-demand — not all at once.

| File                                                                        | When to read                        |
| --------------------------------------------------------------------------- | ----------------------------------- |
| [.memory/instructions-2026-06-26.md](../.memory/instructions-2026-06-26.md) | How to behave                       |
| [.memory/quirks-2026-06-26.md](../.memory/quirks-2026-06-26.md)             | When something breaks unexpectedly  |
| [.memory/preferences-2026-06-26.md](../.memory/preferences-2026-06-26.md)   | Style/design/naming choices         |
| [.memory/decisions-2026-06-26.md](../.memory/decisions-2026-06-26.md)       | Architectural changes               |
| [.memory/security-2026-06-26.md](../.memory/security-2026-06-26.md)         | **ALWAYS — before any code change** |

### Memory Tools

Call `queryMemory` before answering anything about architecture, conventions, or style.

Call `storeMemory` (with a kebab-case `slug`) when:

1. User states a preference or rule → store as Instruction or Preference **before** acting
2. User corrects you → store the correction
3. A command or build fails → store root cause and fix
4. After completing any implementation task → store each architectural decision, convention, or pattern applied that is not already in memory. Do this **before ending the turn**.

Same slug = update, not duplicate.

### Writing Style for Memory Entries

Hemingway style. Short sentences. No jargon. No filler. Be blunt.
Bad: "The system employs an asynchronous locking mechanism to serialise concurrent write operations."
Good: "Use a lock before writing. One write at a time."

### Categories

| Category    | Use for                         |
| ----------- | ------------------------------- |
| Instruction | How to behave                   |
| Quirk       | Project-specific weirdness      |
| Preference  | Style/design/naming             |
| Decision    | Architectural commitments       |
| Security    | Rules that must NEVER be broken |

<!-- hacklm-memory:end -->
