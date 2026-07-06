<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Copilot — Free-LLM Providers & Setup

The in-app **Copilot** (the `✦` button, bottom-right) is a read-only AI you can chat with about the
repo and the living world. The header carries a **provider picker** — the "free LLMs side box" —
that chooses which free, OpenAI-compatible LLM answers. This page lists every provider the box can
use, how to enable it, and the safety boundary.

> **Architecture line (binding):** the Copilot is a NON-deterministic _shell organ_ — it lives in
> `server.ts` + `src/server/{copilot,ai-sandbox}.ts` + `src/ui/copilot.ts`, makes network calls, and
> reads the wall clock. It never imports or touches simulation state, so the seeded determinism
> golden is unaffected (ADR 0004 · [AI-SUBSYSTEM-2026-06-26.md](AI-SUBSYSTEM-2026-06-26.md)
> Part II). In-world "minds" are a different thing entirely — deterministic pre-2016 game AI.

## What it can and cannot do

- **CAN:** read repo files, list directories, `grep`, and run a tiny allow-list of **read-only**
  shell commands (`git log/status/diff/show`, `ls`, `cat`, `bun test`, …). Every answer is grounded
  in the actual code.
- **CANNOT:** write, edit, create, move, or delete anything; install packages; or commit/push. The
  gate is **default-deny** and enforced server-side in `src/server/ai-sandbox.ts` — even a fully
  model-controlled tool call cannot escape it (verified: `rm -rf src` → `command "rm" is not
allowed`).

## Providers the box offers

Keys live **server-side only** (env vars, never in the browser). A keyed provider appears in the
picker **only when at least one key slot is set**; the key-less providers always appear, so the box
works with zero config. The **default/primary** is **FreeLLMAPI** (always present, defaulting to the
`localhost:3001` proxy) — or a `custom` endpoint when `CQM_LLM_ENDPOINT` is set. If a provider errors,
the box **fails over down the chain**: selected provider → every configured key slot for that
provider → FreeLLMAPI slot(s) → LLM7 → Pollinations → every other configured provider slot. This is
the "rolling" reliability path: one dead endpoint or exhausted key no longer ends the turn.

| Provider (picker id)              | Env var to enable      | Free tier (per the June-2026 report)                   | Get a key                       |
| --------------------------------- | ---------------------- | ------------------------------------------------------ | ------------------------------- |
| LLM7 · Codestral (`llm7`)         | _(none)_               | No key, 30 RPM anonymous, tool-calling, 32K ctx        | optional token at token.llm7.io |
| LLM7 · Devstral (`llm7-devstral`) | _(none)_               | No key, 30 RPM anonymous, tool-calling, 384K ctx       | optional token at token.llm7.io |
| Pollinations (`pollinations`)     | `POLLINATIONS_API_KEY` | Now keyed (gen.pollinations.ai); legacy API deprecated | enter.pollinations.ai           |
| SambaNova (`sambanova`)           | `SAMBANOVA_API_KEY`    | Free tier, Llama-3.3-70B, 96K ctx, fast inference      | cloud.sambanova.ai              |
| Together AI (`together`)          | `TOGETHER_API_KEY`     | Free Llama-3.3-70B-Instruct-Turbo-Free model           | api.together.ai                 |
| Groq (`groq`)                     | `GROQ_API_KEY`         | 30 RPM, fast LPU inference, no card                    | console.groq.com                |
| Cerebras (`cerebras`)             | `CEREBRAS_API_KEY`     | 1M tokens/day, fastest throughput, 8K ctx (free)       | cloud.cerebras.ai               |
| OpenRouter (`openrouter`)         | `OPENROUTER_API_KEY`   | `:free` models (auto-router), 20 RPM / 50 RPD          | openrouter.ai                   |
| GitHub Models (`github`)          | `GITHUB_MODELS_TOKEN`  | frontier models (GPT-5/4.1, o-series) via a PAT        | github.com/marketplace/models   |
| Mistral (`mistral`)               | `MISTRAL_API_KEY`      | "Experiment" plan, ~1B tokens/month                    | console.mistral.ai              |
| Google Gemini (`gemini`)          | `GEMINI_API_KEY`       | 2.5 Flash, large context; not available in EU/UK       | aistudio.google.com             |
| NVIDIA NIM (`nvidia`)             | `NVIDIA_API_KEY`       | 100+ models, ~40 RPM shared                            | build.nvidia.com                |
| DeepSeek (`deepseek`)             | `DEEPSEEK_API_KEY`     | V3/R1; 5M trial tokens then paid                       | platform.deepseek.com           |
| Hugging Face (`huggingface`)      | `HF_TOKEN`             | router → many backends, 100K credits/month             | huggingface.co/settings/tokens  |

### FreeLLMAPI (the primary) + the Custom provider

- **FreeLLMAPI pool (`freellmapi`)** — the **primary/default** provider and the **chain head**;
  **always present** in the picker. It points at a locally-running
  [tashfeenahmed/freellmapi](https://github.com/tashfeenahmed/freellmapi) proxy, which stacks the
  free tiers of 16 providers (~1.7B tokens/month) behind one endpoint with its own failover. Its base
  defaults to `http://localhost:3001/v1`; `FREELLMAPI_BASE` overrides it (optionally `FREELLMAPI_KEY`,
  `FREELLMAPI_MODEL`, default `auto`). Tried FIRST; when the proxy isn't running the box falls through
  to the key-less LLM7 then Pollinations.
- **Custom (`custom`)** — any other OpenAI-compatible endpoint via `CQM_LLM_ENDPOINT`
  (+ `CQM_LLM_MODEL`, `CQM_LLM_KEY`). When set, it becomes the **default** provider. Appears when
  `CQM_LLM_ENDPOINT` is set.

### Rolling key slots

Every keyed provider accepts the primary env var plus optional overflow slots:

```bash
# One Groq slot
GROQ_API_KEY=gsk_... bun dev

# Three Groq slots; diagnostics show them as key 1/3, key 2/3, key 3/3.
GROQ_API_KEYS="gsk_one,gsk_two" GROQ_API_KEY_2=gsk_three bun dev

# Same pattern works for any keyed preset:
# CEREBRAS_API_KEYS / CEREBRAS_API_KEY_2
# OPENROUTER_API_KEYS / OPENROUTER_API_KEY_2
# GITHUB_MODELS_TOKENS / GITHUB_MODELS_TOKEN_2
# MISTRAL_API_KEYS / MISTRAL_API_KEY_2
# GEMINI_API_KEYS / GEMINI_API_KEY_2
# NVIDIA_API_KEYS / NVIDIA_API_KEY_2
# DEEPSEEK_API_KEYS / DEEPSEEK_API_KEY_2
# HF_TOKENS / HF_TOKEN_2
# FREELLMAPI_KEYS / FREELLMAPI_KEY_2
# CQM_LLM_KEYS / CQM_LLM_KEY_2
```

Labels only reveal the slot count (`3 key slots` / `key 2/3`); endpoint URLs and credentials never
leave the server process.

## Enabling a provider

Set the env var(s) before starting the server. Examples:

```bash
# Use Groq as a selectable provider (then pick "Groq · Llama-3.3-70B" in the box)
GROQ_API_KEY=gsk_... bun dev

# Or route everything through a local FreeLLMAPI pool (16-provider failover)
FREELLMAPI_BASE=http://localhost:3001/v1 bun dev

# Or pin one custom OpenAI-compatible endpoint as the default
CQM_LLM_ENDPOINT=https://openrouter.ai/api/v1/chat/completions \
CQM_LLM_MODEL=openrouter/free \
CQM_LLM_KEY=sk-or-... \
bun dev
```

With no env vars, the chain head is **FreeLLMAPI** (the `localhost:3001` proxy); when that proxy
isn't running the box falls through to the key-less **LLM7 Codestral** then **LLM7 Devstral** (two
separate models = two separate rate-limit buckets), so it answers immediately out of the box.
Pollinations is now **keyed only** (the legacy `text.pollinations.ai` endpoint is deprecated with a
queue limit of 1; the new `gen.pollinations.ai` requires an API key from `enter.pollinations.ai`).
Free anonymous endpoints can rate-limit; set any one key above for reliable answers. A built-in
800ms cooldown pauses between failover attempts when the previous provider returned 429, giving
the rate-limit window time to reset. (On the static Pages build the browser path is **LLM7-only** —
see _Static deploy_ below.)

> The dev server registers routes at boot, so after changing env vars (or pulling new provider
> presets) **restart `bun dev`** — `--hot` does not re-register `Bun.serve` routes.

## How it's wired

- `GET /api/copilot` → `{ provider, providers: [{ id, label, def }] }` — the picker's list (only
  currently-usable providers; labels + ids only, never endpoints or keys; multi-key providers are
  summarized as `N key slots`).
- `POST /api/chat` → `{ messages, provider? }` — runs the bounded agent loop against the chosen
  provider (default-deny on unknown ids), executing any read-only tool calls through the sandbox.
- `POST /api/tool` → `{ tool, args }` — the panel's manual `/read /ls /grep /run` terminal.
- `GET /api/copilot/health` → probes the recovery chain in parallel. Multi-key providers appear as
  separate rows (`key 1/N`, `key 2/N`, ...), still without exposing credential values.

## Static deploy (GitHub Pages) — browser-direct fallback

The public site is a **static** build with **no Bun server**, so `/api/chat`, `/api/tool`, and
`/api/copilot` all 404 there. To keep the chat alive, `src/ui/copilot.ts` (`askStaticAi`) detects the
non-JSON 404 and calls a **browser-callable, key-less** LLM **directly from the page** — public,
educational conversation only.

- **Provider = LLM7 only**, trying its two anonymous models in order: `codestral-latest` →
  `devstral-small-2:24b`. Both answer from the browser with **no token and no CAPTCHA** (CORS open,
  OpenAI-shaped JSON). The header shows `llm7 · static` when a browser-direct answer is served.
- **Why not Pollinations?** The legacy `text.pollinations.ai` endpoint is deprecated (queue limit
  of 1, 429 "Queue full for IP"). The new `gen.pollinations.ai` requires an API key — it is still
  available as a **keyed server-side provider** (`POLLINATIONS_API_KEY`), but deliberately excluded
  from the browser-direct static path (no key in the bundle).
- **No repo tools, no keys.** `/read /ls /grep /run` need the server sandbox and stay disabled here
  (they answer with a clear "run `bun dev`" notice); only anonymous providers are ever called from the
  client, so no key or secret lives in the bundle. The `🩺` diagnostics, with no server present, probe
  LLM7's models **in the browser** (proving the CORS reachability the fallback relies on).
- **Server parity:** the server's LLM7 preset (`src/server/copilot.ts`) also uses `codestral-latest`
  for the same reason — `gpt-4o-mini` is no longer served anonymously by LLM7.

See also [AI-SUBSYSTEM-2026-06-26.md](AI-SUBSYSTEM-2026-06-26.md) (in-world minds + Copilot reference) and the full
provider field-guide the design drew from in the project's free-LLM report.
