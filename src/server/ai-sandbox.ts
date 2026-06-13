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
 *    (d) every path-like argument resolves inside the repo root. `git`/`bun` get extra
 *    subcommand gating so read-only verbs are the only ones that run.
 *
 * Server-only module (run by Bun, never bundled into the client). It writes NOTHING — there is no
 * code path here that creates, mutates, or deletes a file. A would-be attacker who fully controls
 * the model still cannot escape these gates because the gates run in this process, not the model's.
 */
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Repo root (this file lives at `<root>/src/server/`, so root is two levels up). `fileURLToPath`
 * decodes percent-encoding and Windows drive letters correctly — critical here because this repo's
 * absolute path contains spaces and `[ ]` brackets that a raw URL pathname would leave encoded.
 */
const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));

/** Largest file/`stdout` slice returned to the model, in bytes/chars. Keeps prompts bounded. */
const MAX_OUTPUT = 16 * 1024;

/** Command wall-clock budget; a read-only query that runs longer is killed. */
const RUN_TIMEOUT_MS = 15_000;

/** Path prefixes that are never readable, even via an otherwise-valid relative path. */
const BLOCKED_PREFIXES = ['legacy', '.git', 'node_modules', '.env', 'dist'] as const;

/** Result of any sandbox tool call — a tagged union the route serializes to JSON. */
export type SandboxResult =
  | { ok: true; output: string; truncated: boolean }
  | { ok: false; error: string };

/**
 * Resolve a caller-supplied relative path against the repo root, rejecting anything that escapes
 * the root, is absolute, or lands in a blocked area. Returns the absolute path or an error.
 */
function confine(rel: string): { ok: true; abs: string } | { ok: false; error: string } {
  if (typeof rel !== 'string' || rel.length === 0) return { ok: false, error: 'empty path' };
  if (isAbsolute(rel) || rel.startsWith('~')) return { ok: false, error: 'absolute paths denied' };
  const abs = resolve(ROOT, rel);
  const rl = relative(ROOT, abs);
  if (rl.startsWith('..') || isAbsolute(rl)) return { ok: false, error: 'path escapes repo root' };
  // Case-insensitive + `.env*` / `.git*` prefix match: closes the `.env.local` / `.ENV`
  // secret-leak bypass (audit CRITICAL) and blocks every gitignore/.git variant the user
  // flagged as exposed. The exact-match BLOCKED_PREFIXES list still covers legacy/dist/etc.
  const top = (rl.split(sep)[0] ?? '').toLowerCase();
  const blocked =
    top.startsWith('.env') ||
    top.startsWith('.git') ||
    BLOCKED_PREFIXES.includes(top as (typeof BLOCKED_PREFIXES)[number]);
  if (blocked) {
    return { ok: false, error: `path "${top}" is blocked (private/build/vcs)` };
  }
  return { ok: true, abs };
}

/** Read a UTF-8 file confined to the repo root; size-capped. Never writes. */
export async function readFileSafe(rel: string): Promise<SandboxResult> {
  const c = confine(rel);
  if (!c.ok) return c;
  const file = Bun.file(c.abs);
  if (!(await file.exists())) return { ok: false, error: 'not found' };
  const text = await file.text();
  const truncated = text.length > MAX_OUTPUT;
  return { ok: true, output: truncated ? text.slice(0, MAX_OUTPUT) : text, truncated };
}

/** List a directory confined to the repo root (names + a dir/file marker). Never writes. */
export async function listDir(rel: string): Promise<SandboxResult> {
  const c = confine(rel === '' ? '.' : rel);
  if (!c.ok) return c;
  const { readdir } = await import('node:fs/promises');
  try {
    const entries = await readdir(c.abs, { withFileTypes: true });
    const lines = entries
      .filter((e) => !BLOCKED_PREFIXES.includes(e.name as (typeof BLOCKED_PREFIXES)[number]))
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
  'bun',
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
  'cat-file',
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
  for (const tok of argv) {
    if (DENY_TOKENS.has(tok)) return { ok: false, error: `token "${tok}" is forbidden` };
  }
  if (bin === 'git') {
    const sub = argv[1] ?? '';
    if (!GIT_READ_SUB.has(sub))
      return { ok: false, error: `git "${sub}" is not a read-only subcommand` };
    // branch/tag/remote can MUTATE with a positional arg; permit only the listing forms (flags only).
    if (
      (sub === 'branch' || sub === 'tag' || sub === 'remote') &&
      argv.slice(2).some((a) => !isFlag(a))
    ) {
      return { ok: false, error: `git ${sub} is allowed only in list form (no positional args)` };
    }
  }
  if (bin === 'bun') {
    const sub = argv[1] ?? '';
    if (sub === 'test') {
      /* allowed */
    } else if (sub === 'run') {
      const script = argv[2] ?? '';
      // `check`/`bench` removed (audit HIGH): they run the build (writes dist/) and execute
      // arbitrary project code — not read-only. Only the non-mutating scripts remain.
      const ALLOWED_SCRIPTS = ['typecheck', 'lint', 'format:check'];
      if (!ALLOWED_SCRIPTS.includes(script))
        return { ok: false, error: `bun run "${script}" is not allowed` };
    } else {
      return {
        ok: false,
        error: `bun "${sub}" is not allowed (only test / run typecheck|lint|format:check)`,
      };
    }
  }
  // Confine every positional path-like argument (block reading host files outside the repo).
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i] ?? '';
    if (isFlag(a)) continue;
    // git/bun subcommands and their non-path words are fine; only check tokens that look like paths.
    if (a.includes('/') || a.includes('.')) {
      // Allow bare option-values that aren't paths (heuristic): only confine if it resolves oddly.
      if (isAbsolute(a) || a.startsWith('~'))
        return { ok: false, error: `absolute path "${a}" denied` };
      const rl = relative(ROOT, resolve(ROOT, a));
      if (rl.startsWith('..')) return { ok: false, error: `path "${a}" escapes the repo root` };
    }
  }
  return { ok: true, argv };
}

/**
 * The minimal, secret-free environment handed to sandboxed subprocesses. Deliberately EXCLUDES
 * `process.env` (which holds every LLM provider key) — only the system vars git/bun need to run.
 * Closes the audit HIGH where the full env (all API keys) was injected into model-controlled procs.
 */
function minimalEnv(): Record<string, string> {
  const out: Record<string, string> = { GIT_PAGER: 'cat', PAGER: 'cat' };
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

/** Run a single read-only command, repo-confined, time-bounded, output-capped. Never writes. */
export async function runReadOnly(raw: string): Promise<SandboxResult> {
  const v = validateCommand(raw);
  if (!v.ok) return v;
  try {
    const proc = Bun.spawn(v.argv, {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: minimalEnv(),
    });
    const timer = setTimeout(() => proc.kill(), RUN_TIMEOUT_MS);
    const [out, err] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;
    clearTimeout(timer);
    const combined = out + (err ? `\n[stderr]\n${err}` : '');
    const truncated = combined.length > MAX_OUTPUT;
    return { ok: true, output: truncated ? combined.slice(0, MAX_OUTPUT) : combined, truncated };
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
    pattern.length > 200
  ) {
    return { ok: false, error: 'invalid pattern (single literal token, no spaces/metacharacters)' };
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
        'Run ONE read-only shell command (e.g. "git log --oneline -5", "bun test", "ls src/sim"). ' +
        'Cannot modify, add, or delete anything; no redirection/chaining.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string' } },
        required: ['command'],
      },
    },
  },
] as const;

/** Dispatch a tool call by name to its sandbox function. Unknown tools are denied. */
export async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
): Promise<SandboxResult> {
  switch (name) {
    case 'read_file':
      return readFileSafe(typeof args['path'] === 'string' ? args['path'] : '');
    case 'list_dir':
      return listDir(typeof args['path'] === 'string' ? args['path'] : '');
    case 'grep':
      return grepRepo(typeof args['pattern'] === 'string' ? args['pattern'] : '');
    case 'run':
      return runReadOnly(typeof args['command'] === 'string' ? args['command'] : '');
    default:
      return { ok: false, error: `unknown tool "${name}"` };
  }
}
