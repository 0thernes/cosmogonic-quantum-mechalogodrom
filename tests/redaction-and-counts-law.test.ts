/**
 * Two hardening gates added in the 2026-06-26 exhaustive audit:
 *
 *  1. CREDENTIAL REDACTION (RISK-10) — `redactSecrets` must scrub `Bearer` headers, `sk-…` keys, AND
 *     the common non-`sk-` provider key formats (Groq `gsk_`, HuggingFace `hf_`, NVIDIA `nvapi-`,
 *     Google `AIza`, xAI `xai-`) before any provider error string is surfaced. Without this a
 *     misbehaving provider echoing a non-`sk-` key would leak it into a 300-char error message.
 *
 *  2. BIOLOGIC_FORMS array-length invariant — `CANONICAL_BIOLOGIC_FORMS` is the ONE canonical count
 *     that is a hard array length (unlike the design-vs-wired faculty/Archon counts), so it must equal
 *     `BIOLOGIC_FORMS.length`. sync-surfaces propagates the constant everywhere; this gate stops the
 *     constant and the actual array from silently drifting apart.
 */
import { describe, expect, test } from 'bun:test';
import { redactSecrets } from '../src/server/copilot';
import { BIOLOGIC_FORMS } from '../src/sim/digital-biologics';
import { CANONICAL_BIOLOGIC_FORMS } from '../scripts/canonical-receipts';

describe('credential redaction (RISK-10)', () => {
  const cases: [string, string][] = [
    ['Authorization: Bearer sk-abcdEFGH1234', 'Bearer'],
    ['leaked sk-proj-abcdEFGH1234567890', 'sk-'],
    ['groq key gsk_abcdEFGH1234567890 echoed', 'gsk_'],
    ['hf_abcdEFGH1234567890 mirrored back', 'hf_'],
    ['nvidia nvapi-abcdEFGH1234567890 here', 'nvapi-'],
    ['google AIzaSyAbcdEFGH1234567890 token', 'AIza'],
    ['xai-abcdEFGH1234567890 surfaced', 'xai-'],
  ];
  for (const [input, label] of cases) {
    test(`redacts ${label} keys`, () => {
      const out = redactSecrets(input);
      expect(out).toContain('redacted');
      // The raw secret body must not survive.
      expect(out).not.toContain('abcdEFGH1234567890');
    });
  }

  test('does not over-redact ordinary prose', () => {
    const prose = 'The colour-coded sky and the or-else clause are fine; nothing to redact here.';
    expect(redactSecrets(prose)).toBe(prose);
  });
});

describe('canonical count invariants', () => {
  test('CANONICAL_BIOLOGIC_FORMS equals the real BIOLOGIC_FORMS array length', () => {
    expect(BIOLOGIC_FORMS.length).toBe(CANONICAL_BIOLOGIC_FORMS);
  });
});
