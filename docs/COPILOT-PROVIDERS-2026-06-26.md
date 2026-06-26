<!-- reviewed: 2026-06-26 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Copilot — Free-LLM Providers & Setup

The in-app **Copilot** (the `✦` button, bottom-right) is a read-only AI you can chat with about the
repo and the living world. The header carries a **provider picker** — the "free LLMs side box" —
that chooses which free, OpenAI-compatible LLM answers. This page lists every provider the box can
use, how to enable it, and the safety boundary.

> **Architecture line (binding):** the Copilot is a NON-deterministic _shell organ_ — it lives in
> `server.ts` + `src/server/{copilot,ai-sandbox}.ts` + `src/ui/copilot.ts`, makes network calls, and
> reads the wall clock. It never imports or touches simulation state, so the seeded determinism
> golden is unaffected (ADR 0004 · [research/PRE-TRANSFORMER-GAME-AI.md](research/PRE-TRANSFORMER-GAME-AI.md)
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
picker **only when its key is set**; the two key-less providers always appear, so the box works with
zero config. If the chosen provider errors, the box **fails over once** to the key-less default
(Pollinations) so it still answers.

| Provider (picker id)          | Env var to enable     | Free tier (per the June-2026 report)             | Get a key                       |
| ----------------------------- | --------------------- | ------------------------------------------------ | ------------------------------- |
| Pollinations (`pollinations`) | _(none — default)_    | No key, anonymous; can rate-limit (HTTP 429)     | —                               |
| LLM7 (`llm7`)                 | _(none)_              | No key, 30 RPM anonymous                         | optional token at token.llm7.io |
| Groq (`groq`)                 | `GROQ_API_KEY`        | 30 RPM, fast LPU inference, no card              | console.groq.com                |
| Cerebras (`cerebras`)         | `CEREBRAS_API_KEY`    | 1M tokens/day, fastest throughput, 8K ctx (free) | cloud.cerebras.ai               |
| OpenRouter (`openrouter`)     | `OPENROUTER_API_KEY`  | `:free` models (auto-router), 20 RPM / 50 RPD    | openrouter.ai                   |
| GitHub Models (`github`)      | `GITHUB_MODELS_TOKEN` | frontier models (GPT-5/4.1, o-series) via a PAT  | github.com/marketplace/models   |
| Mistral (`mistral`)           | `MISTRAL_API_KEY`     | "Experiment" plan, ~1B tokens/month              | console.mistral.ai              |
| Google Gemini (`gemini`)      | `GEMINI_API_KEY`      | 2.5 Flash, large context; not available in EU/UK | aistudio.google.com             |
| NVIDIA NIM (`nvidia`)         | `NVIDIA_API_KEY`      | 100+ models, ~40 RPM shared                      | build.nvidia.com                |
| DeepSeek (`deepseek`)         | `DEEPSEEK_API_KEY`    | V3/R1; 5M trial tokens then paid                 | platform.deepseek.com           |
| Hugging Face (`huggingface`)  | `HF_TOKEN`            | router → many backends, 100K credits/month       | huggingface.co/settings/tokens  |

### Two extra, dynamically-offered providers

- **FreeLLMAPI pool (`freellmapi`)** — point the box at a locally-running
  [tashfeenahmed/freellmapi](https://github.com/tashfeenahmed/freellmapi) proxy, which stacks the
  free tiers of 16 providers (~1.7B tokens/month) behind one endpoint with its own failover. Set
  `FREELLMAPI_BASE=http://localhost:3001/v1` (optionally `FREELLMAPI_KEY`, `FREELLMAPI_MODEL`,
  default `auto`). Appears in the picker when `FREELLMAPI_BASE` is set.
- **Custom (`custom`)** — any other OpenAI-compatible endpoint via `CQM_LLM_ENDPOINT`
  (+ `CQM_LLM_MODEL`, `CQM_LLM_KEY`). When set, it becomes the **default** provider. Appears when
  `CQM_LLM_ENDPOINT` is set.

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

With no env vars, the box runs on the key-less Pollinations default (and LLM7) — useful immediately,
though free anonymous endpoints can rate-limit; set any one key above for reliable answers.

> The dev server registers routes at boot, so after changing env vars (or pulling new provider
> presets) **restart `bun dev`** — `--hot` does not re-register `Bun.serve` routes.

## How it's wired

- `GET /api/copilot` → `{ provider, providers: [{ id, label, def }] }` — the picker's list (only
  currently-usable providers; labels + ids only, never endpoints or keys).
- `POST /api/chat` → `{ messages, provider? }` — runs the bounded agent loop against the chosen
  provider (default-deny on unknown ids), executing any read-only tool calls through the sandbox.
- `POST /api/tool` → `{ tool, args }` — the panel's manual `/read /ls /grep /run` terminal.

See also [AI-SUBSYSTEM-2026-06-26.md](AI-SUBSYSTEM-2026-06-26.md) (in-world minds + Copilot reference) and the full
provider field-guide the design drew from in the project's free-LLM report.
