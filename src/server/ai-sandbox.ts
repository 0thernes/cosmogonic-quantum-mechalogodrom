/**
 * Read-only tool sandbox for the Copilot side-chat (CONTRACTS V9 — the LLM shell organ).
 *
 * This is the hard boundary behind the user's rule: the attached chat AI "can read and run but
 * can't change or edit or remove or delete or add code." The model never receives a raw shell —
 * it receives only the four functions exported here, each of which is **default-deny**:
 *
 *  - {@link readFileSafe} / {@link listDir} — filesystem reads CONFINED to the repo root (no `..`
 *    escape, no absolute paths, and the `legacy/` personal files + `.git`/`.env`/`node_modules`
 *    are blocked outright). Output is size-capped.
 *  - {@link grepRepo} — content search via `git grep` (read-only), repo-confined.
 *  - {@link runReadOnly} — executes ONE simple command only if (a) its binary is on a tiny ALLOW
 *    list, (b) no token is on the DENY list, (c) it contains no shell metacharacter
 *    (`> < | & ; $ \` ( )` / newline) so there is no redirection, chaining, or subshell, and
 *    (d) every path-like argument resolves inside the repo root. `git` gets extra subcommand
 *    gating so only read-only verbs run; arbitrary project executors such as Bun are not exposed.
 *
 * Server-only module (run by Bun, never bundled into the client). It writes NOTHING — there is no
 * code path here that creates, mutates, or deletes a file. A would-be attacker who fully controls
 * the model still cannot escape these gates because the gates run in this process, not the model's.
 */
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { webSearch } from './web-search';

/**
 * Repo root (this file lives at `<root>/src/server/`, so root is two levels up). `fileURLToPath`
 * decodes percent-encoding and Windows drive letters correctly — critical here because this repo's
 * absolute path contains spaces and `[ ]` brackets that a raw URL pathname would leave encoded.
 */
const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));

/** Largest file/`stdout` slice returned to the model, in bytes/chars. Keeps prompts bounded. */
const MAX_OUTPUT = 16 * 1024;

/** Largest file the sandbox will read into memory before slicing output. */
const MAX_READ_FILE_BYTES = 1024 * 1024;

/** Largest single file the built-in literal grep fallback will scan. */
const MAX_GREP_FILE_BYTES = 1024 * 1024;

/** Command wall-clock budget; a read-only query that runs longer is killed. */
const RUN_TIMEOUT_MS = 15_000;

/** Path prefixes that are never readable, even via an otherwise-valid relative path. */
const BLOCKED_PREFIXES = [
  'legacy',
  '.git',
  'node_modules',
  '.env',
  'dist',
  // `.claude/worktrees/**` holds full sibling git checkouts (their own `.git`, `.github`, `.memory`
  // notes); only the outermost `.claude` segment ever reached this check before corpus-index.ts and
  // this file's own confine() started walking every path segment, so it must be blocked explicitly —
  // a per-worktree `.memory/*.md` was independently readable via read_file and listed in the RAG
  // corpus manifest fed straight into the chat system prompt (audit MEDIUM).
  '.claude',
  '.memory',
] as const;

/**
 * Is `name` a blocked top-level segment? Case-insensitive `.env*` / `.git*` prefix match (closes the
 * `.env.local` / `.ENV` secret-leak and every `.git*` variant) plus the exact {@link BLOCKED_PREFIXES}.
 * The SINGLE source of truth shared by {@link confine}, {@link listDir}, and corpus-index.ts's RAG
 * manifest builder, so no tool can disagree about what is private (audit: `list_dir` leaked
 * `.gitignore`, `.github/`, `.env.local` filenames that `confine()` refuses to read).
 */
export function isBlockedTop(name: string): boolean {
  const t = name.toLowerCase();
  return (
    t.startsWith('.env') ||
    t.startsWith('.git') ||
    BLOCKED_PREFIXES.includes(t as (typeof BLOCKED_PREFIXES)[number])
  );
}

/** Result of any sandbox tool call — a tagged union the route serializes to JSON. */
export type SandboxResult =
  { ok: true; output: string; truncated: boolean } | { ok: false; error: string };

/**
 * Resolve a caller-supplied relative path against the repo root, rejecting anything that escapes
 * the root, is absolute, or lands in a blocked area. Returns the absolute path or an error.
 */
function confine(rel: string): { ok: true; abs: string } | { ok: false; error: string } {
  if (typeof rel !== 'string' || rel.length === 0) return { ok: false, error: 'empty path' };
  if (isAbsolute(rel) || rel.startsWith('~')) return { ok: false, error: 'absolute paths denied' };
  // Cross-platform: reject Windows-style drive-letter / backslash paths. POSIX `isAbsolute('C:\\…')`
  // returns FALSE, so without this an attacker's `C:\Windows` is treated as an in-repo relative filename
  // and ALLOWED — a sandbox-escape that passed on Windows (caught by isAbsolute there) but slipped through
  // on POSIX CI (audit 2026-06). Backslash is never a legitimate in-repo separator here (POSIX uses `/`).
  if (/^[A-Za-z]:/.test(rel) || rel.includes('\\'))
    return { ok: false, error: 'windows-style paths denied' };
  const abs = resolve(ROOT, rel);
  const rl = relative(ROOT, abs);
  if (rl.startsWith('..') || isAbsolute(rl)) return { ok: false, error: 'path escapes repo root' };
  // Case-insensitive + `.env*` / `.git*` prefix match: closes the `.env.local` / `.ENV`
  // secret-leak bypass (audit CRITICAL) and blocks every gitignore/.git variant the user
  // flagged as exposed. The exact-match BLOCKED_PREFIXES list still covers legacy/dist/etc.
  // Block a private/build/vcs segment at ANY depth, not just the top: `config/.env`,
  // `deploy/.env.production`, `a/node_modules/b`, `x/.git/config` are all refused — matching the
  // docstring's ".env files are blocked outright" claim (previously only the root-level top segment
  // was checked, so a nested secret slipped through — audit MEDIUM).
  const blockedSeg = rl.split(sep).find((s) => isBlockedTop(s));
  if (blockedSeg) {
    return { ok: false, error: `path "${blockedSeg}" is blocked (private/build/vcs)` };
  }
  return { ok: true, abs };
}

/** Read a UTF-8 file confined to the repo root; size-capped. Never writes. */
export async function readFileSafe(rel: string): Promise<SandboxResult> {
  const c = confine(rel);
  if (!c.ok) return c;
  const file = Bun.file(c.abs);
  if (!(await file.exists())) return { ok: false, error: 'not found' };
  if (file.size > MAX_READ_FILE_BYTES) return { ok: false, error: 'file too large' };
  const text = await file.text();
  const truncated = text.length > MAX_OUTPUT;
  return { ok: true, output: truncated ? text.slice(0, MAX_OUTPUT) : text, truncated };
}

/** List a directory confined to the repo root (names + a dir/file marker). Never writes. */
export async function listDir(rel: string): Promise<SandboxResult> {
  const c = confine(rel === '' ? '.' : rel);
  if (!c.ok) return c;
  try {
    const entries = await readdir(c.abs, { withFileTypes: true });
    const lines = entries
      .filter((e) => !isBlockedTop(e.name)) // same private-area test as confine() — no .git*/.env* leak
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort();
    const output = lines.join('\n');
    return { ok: true, output: output.slice(0, MAX_OUTPUT), truncated: output.length > MAX_OUTPUT };
  } catch {
    return { ok: false, error: 'not a directory' };
  }
}

/** Binaries the model may invoke. Everything else is denied. */
const ALLOWED_BINS = new Set([
  'ls',
  'cat',
  'head',
  'tail',
  'wc',
  'find',
  'grep',
  'rg',
  'tree',
  'file',
  'stat',
  'du',
  'pwd',
  'echo',
  'sort',
  'uniq',
  'cut',
  'nl',
  'git',
]);

/** Read-only `git` subcommands. `branch`/`tag` are allowed ONLY in list form (see validate). */
const GIT_READ_SUB = new Set([
  'status',
  'log',
  'diff',
  'show',
  'ls-files',
  'blame',
  'shortlog',
  'describe',
  'rev-parse',
  'grep',
  'reflog',
  'diff-tree',
  'branch',
  'tag',
  'remote',
]);

/** Tokens that, if present ANYWHERE in the command, hard-deny it (write/network/escalation). */
const DENY_TOKENS = new Set([
  'rm',
  'mv',
  'cp',
  'mkdir',
  'rmdir',
  'touch',
  'tee',
  'dd',
  'ln',
  'chmod',
  'chown',
  'chgrp',
  'kill',
  'killall',
  'sudo',
  'su',
  'doas',
  'npm',
  'pnpm',
  'yarn',
  'npx',
  'pip',
  'install',
  'add',
  'commit',
  'push',
  'pull',
  'fetch',
  'clone',
  'checkout',
  'switch',
  'reset',
  'rebase',
  'merge',
  'clean',
  'stash',
  'restore',
  'apply',
  'am',
  'cherry-pick',
  'revert',
  'set-url',
  'curl',
  'wget',
  'ssh',
  'scp',
  'nc',
  'ncat',
  'write',
  'set',
  'export',
  'eval',
  'exec',
  'node',
  'deno',
  'python',
  'python3',
  'sh',
  'bash',
  'zsh',
  'fish',
  'powershell',
  'pwsh',
  'cmd',
  // `find` action primitives — neutralize the `find . -delete` deletion bypass and the
  // `-exec`/`-fprint*` write-and-execute bypass (audit HIGH) while keeping `find` usable
  // for read-only traversal.
  '-delete',
  '-exec',
  '-execdir',
  '-ok',
  '-okdir',
  '-fprint',
  '-fprintf',
  '-fprint0',
  '-fls',
]);

/** Shell metacharacters that imply redirection / chaining / subshell — any one denies the command. */
const META = /[<>|&;$`()\n\r{}]|\.\./;

/** True when an arg is a flag (`-x`, `--long`) rather than a positional. */
const isFlag = (a: string): boolean => a.startsWith('-');

/**
 * Option flags that turn an otherwise read-only tool into one that EXECUTES a process or WRITES a
 * file. A dash-led token is a flag, so the positional path-confine loop skips it — which means these
 * have to be denied by name (audit: `git grep -O<pager>` / `--open-files-in-pager=<cmd>` spawns an
 * arbitrary pager process, escaping the read-only sandbox, and `--output=` writes a file). `-O` and
 * these long options are not needed by ANY allowed read-only tool, so they are denied universally.
 */
const EXEC_OR_WRITE_FLAG = /^-O|^--open-files-in-pager(=|$)|^--output(=|$)/;

/**
 * Per-binary forbidden flags whose danger is tool-specific. `sort -o<file>` / `--output` WRITES a
 * file (but `grep -o` is read-only "only-matching", so `-o` is NOT denied globally); `git grep`
 * `-f<file>` reads a pattern file and `-O` spawns a pager. Matched as prefixes to also catch the
 * attached-value short forms (`-Oid`, `-ofoo`, `-fpat`).
 */
const BIN_FORBIDDEN_FLAG: Record<string, RegExp> = {
  git: /^-[oOf]|^--(file|output|open-files-in-pager)(=|$)/,
  sort: /^-o|^--output(=|$)/,
};

// `-u` is a documented alias for `-p`/`--patch`, and `--patch-with-stat`/`--patch-with-raw` both still
// emit full patch content alongside the requested extra info — all four must be denied identically to
// `-p`/`--patch`, or `git log -u` trivially bypasses the "no unconfined history content" invariant below.
const GIT_PATCH_HISTORY_FLAG = /^-p$|^-u$|^--patch$|^--patch-with-stat$|^--patch-with-raw$/;

/**
 * Validate (default-deny) a raw command string. Returns the parsed argv on success. The check is:
 * no metacharacters; first token on ALLOW; no token on DENY; `git`/`bun` subcommand-gated; every
 * positional path-like arg confined to the repo root.
 */
function validateCommand(raw: string): { ok: true; argv: string[] } | { ok: false; error: string } {
  if (typeof raw !== 'string' || raw.trim().length === 0)
    return { ok: false, error: 'empty command' };
  if (raw.length > 600) return { ok: false, error: 'command too long' };
  if (META.test(raw)) return { ok: false, error: 'shell metacharacters / `..` are not allowed' };
  if (raw.includes('"') || raw.includes("'")) return { ok: false, error: 'quotes are not allowed' };
  const argv = raw.trim().split(/\s+/);
  const bin = argv[0] ?? '';
  if (!ALLOWED_BINS.has(bin))
    return { ok: false, error: `command "${bin}" is not allowed (read-only sandbox)` };
  const binForbidden = BIN_FORBIDDEN_FLAG[bin];
  for (const tok of argv) {
    if (DENY_TOKENS.has(tok)) return { ok: false, error: `token "${tok}" is forbidden` };
    if (EXEC_OR_WRITE_FLAG.test(tok))
      return {
        ok: false,
        error: `option "${tok}" is forbidden (can execute a process or write a file)`,
      };
    if (binForbidden && binForbidden.test(tok))
      return { ok: false, error: `option "${tok}" is forbidden for ${bin} (write/exec)` };
  }
  if (bin === 'git') {
    const sub = argv[1] ?? '';
    if (!GIT_READ_SUB.has(sub))
      return { ok: false, error: `git "${sub}" is not a read-only subcommand` };
    if (sub === 'show') {
      const positionals = argv.slice(2).filter((a) => !isFlag(a));
      if (positionals.some((a) => !a.includes(':'))) {
        return { ok: false, error: 'git show is allowed only for confined <rev>:<path> reads' };
      }
    }
    if (sub === 'log' && argv.slice(2).some((a) => GIT_PATCH_HISTORY_FLAG.test(a))) {
      return {
        ok: false,
        error: 'git log patch output is denied (history contents are not confined)',
      };
    }
    if (sub === 'diff' || sub === 'diff-tree') {
      const positionals = argv.slice(2).filter((a) => !isFlag(a) && a !== '--');
      // A `git diff` / `git diff --cached` with NO pathspec emits the working-tree/index diff of ALL
      // tracked files — including tracked-but-blocked areas (legacy/, .github/…) that the file tools
      // block outright — and with no path argument the per-path confine() loop below has nothing to
      // confine. Require an explicit pathspec so a working-tree diff can never span a blocked directory.
      if (positionals.length === 0) {
        return {
          ok: false,
          error: `git ${sub} requires an explicit confined pathspec (e.g. \`git ${sub} -- src/world.ts\`)`,
        };
      }
      const revisionLike = positionals.some(
        (a) => !a.includes('/') && !a.includes('\\') && !a.includes('.') && !a.includes(':'),
      );
      if (revisionLike) {
        return { ok: false, error: `git ${sub} revision diffs are denied` };
      }
    }
    // branch/tag/remote can MUTATE with a positional arg; permit only the listing forms (flags only).
    if (
      (sub === 'branch' || sub === 'tag' || sub === 'remote') &&
      argv.slice(2).some((a) => !isFlag(a))
    ) {
      return { ok: false, error: `git ${sub} is allowed only in list form (no positional args)` };
    }
  }
  // Confine every positional path-like argument to the repo root AND apply the same private-area
  // block as the file tools. Previously this only checked for a `..` escape, so `run cat .env` /
  // `run cat legacy/x` read exactly the files read_file forbids (audit MEDIUM: the `run` tool
  // bypassed the .env/.git/legacy block); routing through confine() closes that. git accepts
  // `<rev>:<path>` (e.g. `HEAD:.env`), so the path portion after the colon is confined too.
  // Inherently-recursive native traversal re-enters private dirs (legacy/.git/node_modules/.env/dist)
  // because the native binary ignores our per-entry isBlockedTop walk — so `grep -r KEY .`, `find .`,
  // `du .`, `ls -R .`, `rg KEY .` leak the file CONTENTS/paths the file tools forbid (audit CRITICAL:
  // `grep -r KEY .` returned root `.env` keys and `legacy/…PERSONAL…` contents). Deny them; recursive
  // content search must go through `git grep` (routed below to the blocked-area-aware walker) and
  // recursive file listing through `git ls-files`.
  // `find`/`du`/`tree`/`rg` are recursive BY DEFAULT (no flag) — `rg KEY` alone searches the whole cwd
  // tree — so they cannot be made safe via flag inspection; deny outright.
  if (bin === 'find' || bin === 'du' || bin === 'tree' || bin === 'rg') {
    return {
      ok: false,
      error: `"${bin}" is denied (recursive-by-default traversal can leak private dirs); use \`git grep\` / \`git ls-files\``,
    };
  }
  if (bin === 'grep' || bin === 'ls') {
    const recursive = argv.slice(1).some(
      (a) =>
        isFlag(a) &&
        (a === '--recursive' ||
          // `ls -R` is recursive (its `-r` is reverse-sort); grep `-r` and `-R` both recurse.
          (bin === 'ls' ? /^-[a-zA-Z]*R[a-zA-Z]*$/.test(a) : /^-[a-zA-Z]*[rR][a-zA-Z]*$/.test(a)) ||
          // grep ALSO recurses via `--directories=recurse` / `--directories recurse` / `-d recurse` /
          // `-drecurse` (GNU). The r/R regex above misses the `=`- and space-separated spellings, so deny
          // grep's directory-handling option OUTRIGHT: its safe default (`-d read`, skip dirs) needs no
          // flag and no read-only search needs `-d`. Closes the reopened audit-CRITICAL secret leak
          // (`grep -d recurse KEY .` recursed root, exposing .env/.git/legacy past the sandbox).
          (bin === 'grep' && (/^--directories(=|$)/.test(a) || a.startsWith('-d')))),
    );
    if (recursive) {
      return {
        ok: false,
        error: `recursive ${bin} is denied (can leak private dirs); use \`git grep\` for recursive content search`,
      };
    }
  }
  // Confine every positional path argument to the repo root AND the private-area block. For grep/rg the
  // FIRST non-flag positional is the search PATTERN (passed through); every OTHER non-flag positional is
  // a path — INCLUDING bare directory tokens like `legacy`/`dist` that carry no separator (the old
  // `/ \ . isAbsolute` gate skipped them, so `ls legacy` / `grep KEY legacy` enumerated/searched a
  // private dir — audit). echo/pwd take no paths; git keeps `<rev>:<path>` handling and is confined only
  // for path-shaped tokens so a literal like `git grep legacy` is not false-denied.
  const skipPaths = bin === 'echo' || bin === 'pwd';
  const patternTool = bin === 'grep';
  let sawPattern = false;
  for (let i = 1; i < argv.length && !skipPaths; i++) {
    const a = argv[i] ?? '';
    if (isFlag(a)) continue; // write/exec flags are denied above; remaining flags are read-only
    if (patternTool && !sawPattern) {
      sawPattern = true; // the search regex/literal, not a path
      continue;
    }
    const pathPart = bin === 'git' && a.includes(':') ? (a.split(':').pop() ?? a) : a;
    const pathShaped =
      pathPart.includes('/') ||
      pathPart.includes('\\') ||
      pathPart.includes('.') ||
      isAbsolute(pathPart);
    if (bin === 'git' && !pathShaped) continue; // git revs/pathspecs/patterns are not paths
    const c = confine(pathPart);
    if (!c.ok) return { ok: false, error: `argument "${a}" denied: ${c.error}` };
  }
  return { ok: true, argv };
}

function repoRelative(abs: string): string {
  return relative(ROOT, abs).split(sep).join('/');
}

async function grepLiteral(pattern: string, roots: string[] = ['.']): Promise<SandboxResult> {
  const out: string[] = [];
  let outLen = 0;
  let truncated = false;

  async function addLine(abs: string, lineNo: number, text: string): Promise<boolean> {
    const line = `${repoRelative(abs)}:${lineNo}:${text}`;
    out.push(line);
    outLen += line.length + 1;
    if (outLen > MAX_OUTPUT) {
      truncated = true;
      return true;
    }
    return false;
  }

  async function scanFile(abs: string): Promise<boolean> {
    const file = Bun.file(abs);
    if (file.size > MAX_GREP_FILE_BYTES) return false;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.includes(pattern) && (await addLine(abs, i + 1, lines[i] ?? ''))) {
          return true;
        }
      }
    } catch {
      // Binary/unreadable files are equivalent to `git grep -I`: silently skip them.
    }
    return false;
  }

  // Bound the recursion: a symlink loop or a pathologically deep tree would otherwise recurse until the
  // call stack overflows (a DoS on the grep sandbox). 40 levels is far beyond any real source layout.
  const MAX_WALK_DEPTH = 40;
  async function walk(abs: string, depth: number): Promise<boolean> {
    if (depth > MAX_WALK_DEPTH) return false;
    try {
      const entries = await readdir(abs, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (isBlockedTop(entry.name)) continue;
        const child = resolve(abs, entry.name);
        if (entry.isDirectory()) {
          if (await walk(child, depth + 1)) return true;
        } else if (entry.isFile() && (await scanFile(child))) {
          return true;
        }
      }
    } catch {
      return scanFile(abs);
    }
    return false;
  }

  for (const root of roots) {
    const c = confine(root);
    if (!c.ok) return c;
    if (await walk(c.abs, 0)) break;
  }

  const output = out.join('\n');
  return { ok: true, output: truncated ? output.slice(0, MAX_OUTPUT) : output, truncated };
}

function gitGrepRequest(argv: string[]): { pattern: string; roots: string[] } | null {
  if (argv[0] !== 'git' || argv[1] !== 'grep') return null;
  const positional = argv.slice(2).filter((a) => !isFlag(a));
  const pattern = positional[0];
  if (pattern === undefined) return null;
  return { pattern, roots: positional.slice(1).length > 0 ? positional.slice(1) : ['.'] };
}
/**
 * The minimal, secret-free environment handed to sandboxed subprocesses. Deliberately EXCLUDES
 * `process.env` (which holds every LLM provider key) — only the system variables native readers
 * and Git need to run.
 * Closes the audit HIGH where the full env (all API keys) was injected into model-controlled procs.
 */
function minimalEnv(): Record<string, string> {
  const out: Record<string, string> = {
    GIT_OPTIONAL_LOCKS: '0',
    GIT_PAGER: 'cat',
    PAGER: 'cat',
  };
  for (const k of [
    'PATH',
    'Path',
    'SystemRoot',
    'SYSTEMROOT',
    'windir',
    'ComSpec',
    'COMSPEC',
    'TEMP',
    'TMP',
    'HOME',
    'USERPROFILE',
    'LANG',
    'LC_ALL',
  ]) {
    const v = process.env[k];
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

interface CappedText {
  text: string;
  truncated: boolean;
}

async function readCappedStream(
  stream: ReadableStream<Uint8Array>,
  limit: number,
  onLimit: () => void,
): Promise<CappedText> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  let truncated = false;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      const value = chunk.value;
      const remaining = limit - bytes;
      if (value.byteLength > remaining) {
        if (remaining > 0) text += decoder.decode(value.subarray(0, remaining), { stream: true });
        truncated = true;
        onLimit();
        await reader.cancel();
        break;
      }
      bytes += value.byteLength;
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { text, truncated };
  } finally {
    reader.releaseLock();
  }
}

/** Run a single read-only command, repo-confined, time-bounded, output-capped. Never writes. */
export async function runReadOnly(raw: string, signal?: AbortSignal): Promise<SandboxResult> {
  const v = validateCommand(raw);
  if (!v.ok) return v;
  if (v.argv[0] === 'echo') {
    const output = `${v.argv.slice(1).join(' ')}\n`;
    return { ok: true, output, truncated: false };
  }
  const grep = gitGrepRequest(v.argv);
  if (grep) return grepLiteral(grep.pattern, grep.roots);
  try {
    const proc = Bun.spawn(v.argv, {
      cwd: ROOT,
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
      env: minimalEnv(),
    });
    let timedOut = false;
    const stopAtLimit = (): void => proc.kill();
    // Turn deadline / client disconnect (the copilot AbortSignal) kills the child NOW, instead of
    // letting it run out its own RUN_TIMEOUT_MS after the caller has already given up.
    const onAbort = (): void => proc.kill();
    if (signal?.aborted) proc.kill();
    else signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, RUN_TIMEOUT_MS);
    try {
      const [code, [stdout, stderr]] = await Promise.all([
        proc.exited,
        Promise.all([
          readCappedStream(proc.stdout, MAX_OUTPUT + 1, stopAtLimit),
          readCappedStream(proc.stderr, MAX_OUTPUT + 1, stopAtLimit),
        ]),
      ]);
      if (timedOut) return { ok: false, error: 'command timed out' };
      const out = stdout.text;
      const err = stderr.text;
      if (code !== 0 && out.length === 0 && err.length > 0 && !stderr.truncated) {
        return { ok: false, error: err.trim().slice(0, 500) };
      }
      const combined = out + (err ? `\n[stderr]\n${err}` : '');
      const truncated = stdout.truncated || stderr.truncated || combined.length > MAX_OUTPUT;
      return { ok: true, output: combined.slice(0, MAX_OUTPUT), truncated };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  } catch (e) {
    return { ok: false, error: `execution failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Content search via `git grep` (read-only, repo-confined). `pattern` is passed as a literal. */
export async function grepRepo(pattern: string): Promise<SandboxResult> {
  if (typeof pattern !== 'string' || pattern.trim().length === 0) {
    return { ok: false, error: 'empty pattern' };
  }
  if (
    META.test(pattern) ||
    /\s/.test(pattern) ||
    pattern.includes('"') ||
    pattern.includes("'") ||
    pattern.startsWith('-') ||
    pattern.length > 200
  ) {
    return {
      ok: false,
      error:
        'invalid pattern (one literal token; no spaces, metacharacters, quotes, or leading dash)',
    };
  }
  // -n line numbers, -I skip binary, --fixed-strings = literal (no injection via regex), capped.
  return runReadOnly(`git grep -n -I --fixed-strings ${pattern}`);
}

/** The tool surface advertised to the model (OpenAI function-tool schema). */
export const SANDBOX_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a UTF-8 file from the repository (read-only; repo-confined).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'repo-relative path, e.g. src/world.ts' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List a directory in the repository (read-only).',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'repo-relative dir, e.g. src/sim' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'grep',
      description: 'Search repository file contents for a literal string (read-only).',
      parameters: {
        type: 'object',
        properties: { pattern: { type: 'string' } },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run',
      description:
        'Run ONE read-only shell command (e.g. "git log --oneline -5", "git status --short", "ls src/sim"). ' +
        'Cannot modify, add, or delete anything; no redirection/chaining.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string' } },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Search the PUBLIC web for OUTSIDE knowledge (science, math, history, general facts) via a ' +
        'key-less public endpoint. Provide a QUERY string (never a URL). Public/educational use only — ' +
        'refuses secrets, private data, and harmful requests; cite the returned source URL.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'a public-knowledge search query' } },
        required: ['query'],
      },
    },
  },
] as const;

/** Dispatch a tool call by name to its sandbox function. Unknown tools are denied. The optional
 *  `signal` (the copilot turn deadline / client-disconnect) is forwarded to the resource-holding tools
 *  (`run` spawns a child, `web_search` fetches) so a turn cancellation kills them NOW instead of letting
 *  them run out their own internal timeout after the caller has given up. Pure-JS tools are fast + bounded. */
export async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<SandboxResult> {
  switch (name) {
    case 'read_file':
      return readFileSafe(typeof args['path'] === 'string' ? args['path'] : '');
    case 'list_dir':
      return listDir(typeof args['path'] === 'string' ? args['path'] : '');
    case 'grep':
      return grepRepo(typeof args['pattern'] === 'string' ? args['pattern'] : '');
    case 'run':
      return runReadOnly(typeof args['command'] === 'string' ? args['command'] : '', signal);
    case 'web_search':
      return webSearch(typeof args['query'] === 'string' ? args['query'] : '', signal);
    default:
      return { ok: false, error: `unknown tool "${name}"` };
  }
}
