/**
 * Copilot chat panel (CONTRACTS V9 — UI shell, NOT a sim system).
 *
 * A self-mounting side panel that lets the user "ask, learn, and talk about this world" with a
 * free AI which can READ the repo and RUN read-only commands but can never change code. It talks
 * only to our own server routes (`/api/chat`, `/api/tool`, `/api/copilot`) — the LLM provider key,
 * if any, lives server-side. It never imports or touches sim state, so the deterministic golden is
 * unaffected (see docs/research/PRE-TRANSFORMER-GAME-AI.md Part II).
 *
 * Two ways to use it:
 *  - Type a question → the server runs the agent loop (model may read files / run read-only
 *    commands via the ai-sandbox gate) and answers, showing what it read/ran.
 *  - Type a slash command → a manual read-only terminal: `/read <path>`, `/ls <path>`,
 *    `/grep <token>`, `/run <command>`, `/help`.
 *
 * Mounts itself on import (a floating toggle button + a hidden panel), so the only wiring needed is
 * a single `import './ui/copilot'` in the client entry. All model/tool output is rendered via
 * `textContent`, never `innerHTML`, so untrusted text can't inject markup.
 */

import { mountToggle } from './panel-dock';

interface ToolStep {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  output: string;
}
interface AgentResult {
  ok: boolean;
  reply: string;
  steps: ToolStep[];
  provider: string;
}
type ToolResult = { ok: true; output: string; truncated?: boolean } | { ok: false; error: string };
interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * STATIC-DEPLOY AI FALLBACK — on the GitHub Pages build there is no Bun server (no `/api/chat`), so the
 * chat would otherwise be dead. We call a free, KEY-LESS, CORS-enabled, **browser-callable** LLM directly.
 *
 * Provider = LLM7 (`api.llm7.io`, the same keyless provider the local server lists). Two of its models
 * answer ANONYMOUSLY (no token, no CAPTCHA): `codestral-latest` + `devstral-small-2:24b` — we try them in
 * order. (Pollinations, the server's other fallback, now gates *browser* requests behind a Cloudflare
 * Turnstile token — `{"error":"Missing Turnstile token"}` — so it works from the server/curl but NOT from
 * a static page; LLM7 is the one that works client-side.) Verified live: CORS open, real content returned.
 * The repo-reading tools (/read /ls /grep /run) stay dev-only — they need the server — but conversation
 * works everywhere. For the bigger models + higher limits, a free token from token.llm7.io can be added.
 */
const LLM7_URL = 'https://api.llm7.io/v1/chat/completions';
const STATIC_AI_MODELS = ['codestral-latest', 'devstral-small-2:24b'] as const;
const STATIC_AI_SYSTEM =
  'You are the ✦ AI guide inside the Cosmogonic Quantum Mechalogodrom — a deterministic, browser-native ' +
  '50,000-agent quantum + artificial-life cosmos simulation (real seeded math, not an LLM toy). Answer ' +
  'questions about the cosmos, its creatures, the apex super-creatures, and how the simulation works — ' +
  'vivid but accurate, concise. You are on the static GitHub Pages build, so the repo commands ' +
  '(/read /ls /grep /run) are unavailable here (they need the local `bun dev` server); just converse.';

/** Call a free, key-less, browser-callable LLM straight from the page. Tries each anonymous model. */
async function askStaticAi(history: readonly Msg[]): Promise<string> {
  const messages = [{ role: 'system' as const, content: STATIC_AI_SYSTEM }, ...history];
  let lastErr = 'no provider';
  for (const model of STATIC_AI_MODELS) {
    try {
      const res = await fetch(LLM7_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages }),
      });
      if (!res.ok) {
        lastErr = `llm7 ${res.status}`;
        continue;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        detail?: string;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) return content;
      lastErr = data.detail || 'empty reply'; // e.g. a model that needs a token → try the next
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastErr);
}
/** One provider's health from /api/copilot/health (the recovery-pipeline rows). */
interface ProviderHealth {
  id: string;
  label: string;
  keyed: boolean;
  reachable: boolean;
  status: number;
  latencyMs: number;
  detail: string;
}
interface HealthResult {
  ok: boolean;
  enabled: boolean;
  operational?: boolean;
  reason: string;
  default?: string;
  providers: ProviderHealth[];
}

const STYLE = `
#cqm-cop-toggle{position:fixed;right:10px;bottom:10px;z-index:60;width:42px;height:42px;border-radius:50%;
  border:1px solid rgba(120,160,220,.5);background:rgba(6,10,22,.82);color:#bcd2f5;font-size:19px;cursor:pointer;
  backdrop-filter:blur(6px);box-shadow:0 2px 14px rgba(0,0,0,.5);transition:transform .15s,background .15s}
#cqm-cop-toggle:hover{transform:scale(1.08);background:rgba(14,22,44,.92)}
#cqm-cop-toggle:focus-visible{outline:2px solid #6da8ff;outline-offset:2px}
/* V71: the "down the middle 50/50 split" the directive asks for — answers on the left half, the
   textbox + options on the right half. Wider so both halves breathe; stacks on narrow screens. */
#cqm-cop-panel{position:fixed;right:10px;bottom:128px;z-index:60;width:min(94vw,760px);height:min(74vh,600px);
  display:none;flex-direction:column;border:1px solid rgba(120,160,220,.4);border-radius:12px;
  background:rgba(4,8,18,.94);backdrop-filter:blur(10px);box-shadow:0 8px 40px rgba(0,0,0,.6);
  font:12px/1.5 var(--font-mono,ui-monospace,monospace);color:#cfe0fb;overflow:hidden}
#cqm-cop-panel.open{display:flex}
.cqm-cop-head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(120,160,220,.25);
  background:rgba(10,16,34,.7);flex:0 0 auto}
.cqm-cop-head b{font-size:12px;letter-spacing:.08em;color:#9fc0ff}
.cqm-cop-prov{font-size:9px;opacity:.6;margin-left:6px;white-space:nowrap}
.cqm-cop-x{margin-left:auto;background:none;border:none;color:#9fc0ff;font-size:16px;cursor:pointer;padding:0 4px}
/* The 50/50 body: answer column | controls column. */
.cqm-cop-body{flex:1 1 auto;min-height:0;display:flex}
.cqm-cop-left{flex:1 1 50%;min-width:0;display:flex;flex-direction:column}
.cqm-cop-right{flex:1 1 50%;min-width:0;display:flex;flex-direction:column;border-left:1px solid rgba(120,160,220,.22);background:rgba(6,11,24,.5)}
.cqm-cop-colhead{font:600 9px var(--font-mono,ui-monospace,monospace);letter-spacing:.14em;color:#7fa0d8;
  text-transform:uppercase;padding:6px 10px 3px;opacity:.8}
.cqm-cop-opts{padding:2px 10px 8px;border-bottom:1px solid rgba(120,160,220,.16);display:flex;flex-direction:column;gap:6px}
.cqm-cop-optrow{display:flex;align-items:center;gap:6px}
.cqm-cop-sel{flex:1;min-width:0;background:rgba(2,6,16,.9);color:#bcd2f5;
  border:1px solid rgba(120,160,220,.35);border-radius:5px;font:10px var(--font-mono,ui-monospace,monospace);
  padding:3px 5px;cursor:pointer}
.cqm-cop-sel:focus-visible{outline:1px solid #6da8ff}
.cqm-cop-chips{display:flex;flex-wrap:wrap;gap:4px}
.cqm-cop-chip{border:1px solid rgba(120,160,220,.3);background:rgba(20,30,56,.5);color:#bcd2f5;border-radius:12px;
  font:10px var(--font-mono,ui-monospace,monospace);padding:2px 8px;cursor:pointer;transition:background .12s}
.cqm-cop-chip:hover{background:rgba(34,48,86,.85)}
.cqm-cop-chip:focus-visible{outline:1px solid #6da8ff}
.cqm-cop-log{flex:1 1 auto;min-height:0;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px}
@media (max-width:560px){.cqm-cop-body{flex-direction:column}.cqm-cop-right{border-left:none;border-top:1px solid rgba(120,160,220,.22)}}
.cqm-cop-msg{padding:6px 9px;border-radius:8px;white-space:pre-wrap;word-break:break-word}
.cqm-cop-user{align-self:flex-end;background:rgba(50,80,150,.4);max-width:88%}
.cqm-cop-ai{align-self:flex-start;background:rgba(20,30,56,.7);max-width:94%}
.cqm-cop-sys{align-self:center;font-size:10px;opacity:.65;text-align:center;max-width:96%}
.cqm-cop-tool{align-self:flex-start;max-width:96%;border-left:2px solid rgba(120,160,220,.5);
  background:rgba(8,14,30,.7);padding:5px 8px;border-radius:4px;font-size:10.5px;opacity:.92}
.cqm-cop-tool pre{margin:3px 0 0;max-height:170px;overflow:auto;white-space:pre-wrap;color:#a9c4ea}
.cqm-cop-foot{flex:1 1 auto;min-height:0;padding:7px 10px;display:flex;flex-direction:column;gap:6px}
.cqm-cop-foot textarea{flex:1 1 auto;min-height:48px;resize:none;background:rgba(2,6,16,.9);color:#dceaff;
  border:1px solid rgba(120,160,220,.35);border-radius:6px;padding:6px 8px;font:inherit}
.cqm-cop-foot textarea:focus-visible{outline:1px solid #6da8ff}
.cqm-cop-send{flex:0 0 auto;background:rgba(50,90,170,.55);color:#dfeaff;border:1px solid rgba(120,160,220,.5);
  border-radius:6px;padding:7px 12px;cursor:pointer;font:inherit}
.cqm-cop-send:disabled{opacity:.4;cursor:default}
.cqm-cop-hint{font-size:9px;opacity:.5;padding:0 10px 8px;flex:0 0 auto}
.cqm-cop-diagbtn{background:none;border:none;color:#9fc0ff;font-size:13px;cursor:pointer;padding:0 3px;line-height:1}
.cqm-cop-diagbtn:hover{filter:brightness(1.25)}
.cqm-cop-diagbtn:focus-visible{outline:1px solid #6da8ff;outline-offset:1px}
.cqm-cop-diag{align-self:stretch;border:1px solid rgba(120,160,220,.3);border-radius:8px;
  background:rgba(8,14,30,.72);padding:8px 10px;font-size:10.5px}
.cqm-cop-diag h4{margin:0 0 5px;font-size:10.5px;letter-spacing:.06em;color:#9fc0ff;font-weight:600}
.cqm-cop-diag .verdict{margin:0 0 6px;opacity:.85;white-space:pre-wrap}
.cqm-cop-diag .row{display:flex;align-items:center;gap:6px;padding:2px 0;white-space:nowrap;overflow:hidden}
.cqm-cop-diag .row span:nth-child(2){overflow:hidden;text-overflow:ellipsis}
.cqm-cop-diag .dot{flex:none;font-size:11px}
.cqm-cop-diag .up{color:#7bd88f}
.cqm-cop-diag .down{color:#e2766b}
.cqm-cop-diag .lat{margin-left:auto;opacity:.55;font-size:9.5px;flex:none}
.cqm-cop-diag .reprobe{margin-top:8px;background:rgba(50,90,170,.5);color:#dfeaff;
  border:1px solid rgba(120,160,220,.45);border-radius:5px;padding:3px 10px;cursor:pointer;font:inherit}
.cqm-cop-diag .reprobe:disabled{opacity:.4;cursor:default}
`;

/** Build, style, and attach the panel to the document. Returns the wired controls. */
function mount(): void {
  if (document.getElementById('cqm-cop-toggle')) return; // idempotent

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const toggle = document.createElement('button');
  toggle.id = 'cqm-cop-toggle';
  toggle.type = 'button';
  toggle.textContent = '✦';
  toggle.title = 'Copilot — chat about this world (read-only AI)';
  toggle.setAttribute('aria-label', 'Open Copilot chat');

  const panel = document.createElement('div');
  panel.id = 'cqm-cop-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Copilot chat');

  const head = document.createElement('div');
  head.className = 'cqm-cop-head';
  const title = document.createElement('b');
  title.textContent = 'COPILOT';
  const prov = document.createElement('span');
  prov.className = 'cqm-cop-prov';
  prov.textContent = '…';
  // The "free LLMs side box": pick which free provider answers (populated from /api/copilot).
  const sel = document.createElement('select');
  sel.className = 'cqm-cop-sel';
  sel.setAttribute('aria-label', 'Choose the free AI provider');
  sel.title = 'Free LLM provider';
  const diag = document.createElement('button');
  diag.className = 'cqm-cop-diagbtn';
  diag.type = 'button';
  diag.textContent = '🩺';
  diag.title = 'AI diagnostics — probe provider health + recovery pipeline';
  diag.setAttribute('aria-label', 'Run AI diagnostics');
  const close = document.createElement('button');
  close.className = 'cqm-cop-x';
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close Copilot');
  head.append(title, prov, close);

  // 50/50 body: the generative answer/conversation on the LEFT, the compose box + options on the RIGHT.
  const body = document.createElement('div');
  body.className = 'cqm-cop-body';

  const leftCol = document.createElement('div');
  leftCol.className = 'cqm-cop-left';
  const logHead = document.createElement('div');
  logHead.className = 'cqm-cop-colhead';
  logHead.textContent = 'Answer';
  const logEl = document.createElement('div');
  logEl.className = 'cqm-cop-log';
  leftCol.append(logHead, logEl);

  const rightCol = document.createElement('div');
  rightCol.className = 'cqm-cop-right';
  const askHead = document.createElement('div');
  askHead.className = 'cqm-cop-colhead';
  askHead.textContent = 'Ask · options';
  // Options block: free-LLM provider picker, diagnostics, and quick read-only command chips.
  const opts = document.createElement('div');
  opts.className = 'cqm-cop-opts';
  const optRow = document.createElement('div');
  optRow.className = 'cqm-cop-optrow';
  optRow.append(sel, diag);
  const chips = document.createElement('div');
  chips.className = 'cqm-cop-chips';

  const foot = document.createElement('div');
  foot.className = 'cqm-cop-foot';
  const input = document.createElement('textarea');
  input.placeholder = 'Ask about the cosmos… or /help';
  input.setAttribute('aria-label', 'Message the Copilot');
  const send = document.createElement('button');
  send.className = 'cqm-cop-send';
  send.type = 'button';
  send.textContent = 'Send';
  foot.append(input, send);

  const hint = document.createElement('div');
  hint.className = 'cqm-cop-hint';
  hint.textContent =
    'Read-only AI · /read <path> /ls <dir> /grep <token> /run <cmd> · sends to a free external AI';

  // Quick read-only command options — clicking seeds the compose box so the user can fill the rest.
  const CHIP_CMDS: [string, string][] = [
    ['/read', '/read '],
    ['/ls', '/ls '],
    ['/grep', '/grep '],
    ['/run', '/run '],
    ['/help', '/help'],
  ];
  for (const [label, seed] of CHIP_CMDS) {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'cqm-cop-chip';
    c.textContent = label;
    c.addEventListener('click', () => {
      input.value = seed;
      input.focus();
      const end = seed.length;
      try {
        input.setSelectionRange(end, end);
      } catch {
        /* setSelectionRange unsupported on some hosts — focus alone is fine */
      }
    });
    chips.appendChild(c);
  }
  opts.append(optRow, chips);
  rightCol.append(askHead, opts, foot, hint);

  body.append(leftCol, rightCol);
  panel.append(head, body);
  mountToggle(toggle); // V33: live in the shared bottom dock bar (the ✦ AI button)
  document.body.appendChild(panel);

  const history: Msg[] = [];
  let busy = false;
  let greeted = false;
  /** The free-LLM provider id the user picked (empty = server default). */
  let selectedProvider = '';

  const scroll = (): void => {
    logEl.scrollTop = logEl.scrollHeight;
  };

  const addMsg = (cls: string, text: string): HTMLElement => {
    const el = document.createElement('div');
    el.className = `cqm-cop-msg ${cls}`;
    el.textContent = text;
    logEl.appendChild(el);
    scroll();
    return el;
  };

  const addTool = (step: ToolStep): void => {
    const wrap = document.createElement('div');
    wrap.className = 'cqm-cop-tool';
    const label = document.createElement('div');
    const argStr = Object.values(step.args).join(' ');
    label.textContent = `${step.ok ? '⚙' : '⚠'} ${step.tool} ${argStr}`.trim();
    const pre = document.createElement('pre');
    pre.textContent = step.output.length > 4000 ? step.output.slice(0, 4000) + '\n…' : step.output;
    wrap.append(label, pre);
    logEl.appendChild(wrap);
    scroll();
  };

  const setBusy = (b: boolean): void => {
    busy = b;
    send.disabled = b;
    input.disabled = b;
  };

  async function manualTool(cmd: string): Promise<void> {
    const sp = cmd.indexOf(' ');
    const verb = (sp < 0 ? cmd : cmd.slice(0, sp)).toLowerCase();
    const rest = sp < 0 ? '' : cmd.slice(sp + 1).trim();
    if (verb === '/help') {
      addMsg(
        'cqm-cop-sys',
        'Commands: /read <path> · /ls <dir> · /grep <token> · /run <read-only cmd> · /help. Or just type a question — the AI can read files and run read-only commands for you. It can never change code.',
      );
      return;
    }
    const map: Record<string, { tool: string; key: string }> = {
      '/read': { tool: 'read_file', key: 'path' },
      '/ls': { tool: 'list_dir', key: 'path' },
      '/grep': { tool: 'grep', key: 'pattern' },
      '/run': { tool: 'run', key: 'command' },
    };
    const m = map[verb];
    if (!m) {
      addMsg('cqm-cop-sys', `Unknown command "${verb}". Try /help.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: m.tool, args: { [m.key]: rest } }),
      });
      const data = (await res.json()) as ToolResult;
      addTool({
        tool: m.tool,
        args: { [m.key]: rest },
        ok: data.ok,
        output: data.ok ? data.output : data.error,
      });
    } catch (e) {
      addMsg('cqm-cop-sys', `tool error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function ask(text: string): Promise<void> {
    history.push({ role: 'user', content: text });
    setBusy(true);
    const thinking = addMsg('cqm-cop-sys', 'thinking…');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, provider: selectedProvider || undefined }),
      });
      // On the STATIC GitHub Pages deploy there is no Bun server, so `/api/chat` 404s (or the SPA
      // fallback returns index.html). Detect that and explain it honestly instead of spilling a raw
      // "Unexpected token <" JSON-parse error — the ✦ AI agent is a local-dev-server feature.
      const ctype = res.headers.get('content-type') ?? '';
      if (!res.ok || !ctype.includes('application/json')) {
        // No Bun server (static GitHub Pages) → call the free, key-less LLM7 DIRECTLY from the browser
        // so the chat still works. The repo-command tools stay dev-only (they need /api/tool).
        try {
          const reply = await askStaticAi(history);
          thinking.remove();
          addMsg('cqm-cop-ai', reply);
          history.push({ role: 'assistant', content: reply });
          prov.textContent = 'llm7 · static';
        } catch {
          thinking.remove();
          addMsg(
            'cqm-cop-sys',
            'The free static AI (LLM7) was unreachable just now — try again in a moment. For the ' +
              'full repo-aware agent (/read /ls /grep /run), run `bun dev` locally.',
          );
        }
        return;
      }
      const data = (await res.json()) as AgentResult;
      thinking.remove();
      for (const step of data.steps ?? []) addTool(step);
      addMsg('cqm-cop-ai', data.reply || '(no answer)');
      history.push({ role: 'assistant', content: data.reply || '' });
      // Reflect which free LLM actually served this turn (makes a failover visible).
      if (data.provider) prov.textContent = data.provider;
      // Every provider failed → point the user at the diagnostics + recovery pipeline.
      if (data.ok === false)
        addMsg('cqm-cop-sys', 'All providers failed this turn — click 🩺 to diagnose + restart.');
    } catch (e) {
      thinking.remove();
      addMsg(
        'cqm-cop-sys',
        `chat error: ${e instanceof Error ? e.message : String(e)} — click 🩺 to run diagnostics.`,
      );
    } finally {
      setBusy(false);
    }
  }

  // AI DIAGNOSTICS + RECOVERY (the "AI offline → show diagnostics, failure reason, restart, recovery
  // pipeline" requirement): probe every provider in the failover chain and render it as a live pipeline
  // with health lights + a re-probe (restart) control. A recovered provider re-enables the input.
  let diagBusy = false;
  async function runDiagnostics(): Promise<void> {
    if (diagBusy) return;
    diagBusy = true;
    diag.disabled = true;
    if (!panel.classList.contains('open')) openPanel();
    const card = document.createElement('div');
    card.className = 'cqm-cop-diag';
    const h = document.createElement('h4');
    h.textContent = '🩺 AI DIAGNOSTICS — probing providers…';
    card.appendChild(h);
    logEl.appendChild(card);
    scroll();
    try {
      const res = await fetch('/api/copilot/health');
      const d = (await res.json()) as HealthResult;
      card.replaceChildren();
      const h2 = document.createElement('h4');
      h2.textContent = d.enabled ? '🩺 AI DIAGNOSTICS' : '🩺 AI DIAGNOSTICS — disabled';
      const verdict = document.createElement('div');
      verdict.className = 'verdict';
      verdict.textContent = d.reason + (d.default ? `\nDefault: ${d.default}` : '');
      card.append(h2, verdict);
      if (d.providers && d.providers.length > 0) {
        const lbl = document.createElement('div');
        lbl.className = 'verdict';
        lbl.textContent = 'Recovery pipeline (failover order):';
        card.appendChild(lbl);
        for (const p of d.providers) {
          const row = document.createElement('div');
          row.className = 'row';
          const dot = document.createElement('span');
          dot.className = `dot ${p.reachable ? 'up' : 'down'}`;
          dot.textContent = p.reachable ? '●' : '○';
          const name = document.createElement('span');
          name.textContent = `${p.label}${p.keyed ? ' 🔑' : ''} — ${p.detail}`;
          const lat = document.createElement('span');
          lat.className = 'lat';
          lat.textContent = `${p.latencyMs}ms`;
          row.append(dot, name, lat);
          card.appendChild(row);
        }
      }
      const btn = document.createElement('button');
      btn.className = 'reprobe';
      btn.type = 'button';
      btn.textContent = '↻ Re-probe / restart';
      btn.addEventListener('click', () => void runDiagnostics());
      card.appendChild(btn);
      // A recovered provider re-opens the chat (the restart path): unlock the input + clear the notice.
      if (d.enabled && (d.operational ?? true)) {
        input.disabled = false;
        send.disabled = false;
        if (/disabled|offline/i.test(input.placeholder))
          input.placeholder = 'Ask about the cosmos… or /help';
        prov.textContent = d.default ?? prov.textContent;
      }
    } catch (e) {
      card.replaceChildren();
      const h2 = document.createElement('h4');
      h2.textContent = '🩺 AI DIAGNOSTICS — probe failed';
      const msg = document.createElement('div');
      msg.className = 'verdict';
      msg.textContent = `Could not reach the diagnostics endpoint: ${
        e instanceof Error ? e.message : String(e)
      }. The dev server may be down — restart it and re-probe.`;
      card.append(h2, msg);
    } finally {
      diagBusy = false;
      diag.disabled = false;
      scroll();
    }
  }
  diag.addEventListener('click', () => void runDiagnostics());

  const submit = (): void => {
    if (busy) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    if (text.startsWith('/')) {
      addMsg('cqm-cop-user', text);
      void manualTool(text);
    } else {
      addMsg('cqm-cop-user', text);
      void ask(text);
    }
  };

  const openPanel = (): void => {
    panel.classList.add('open');
    input.focus();
    if (!greeted) {
      greeted = true;
      addMsg(
        'cqm-cop-sys',
        'Copilot online. I can read this repo and run read-only commands to answer questions about the cosmos and its code — but I can never change anything. Note: messages are sent to a free external AI.',
      );
      fetch('/api/copilot')
        .then(
          (r) =>
            r.json() as Promise<{
              enabled?: boolean;
              provider?: string;
              providers?: { id: string; label: string; def: boolean }[];
            }>,
        )
        .then((d) => {
          // Copilot is opt-in and off by default in production (server gate) so a public deploy
          // never exposes source. When disabled, present a clear notice and lock the input.
          if (d.enabled === false) {
            prov.textContent = 'disabled in this deployment';
            sel.style.display = 'none';
            input.disabled = true;
            input.placeholder = 'Copilot is disabled in this deployment';
            send.disabled = true;
            addMsg(
              'cqm-cop-sys',
              'Copilot is disabled in this deployment. Click 🩺 in the header for diagnostics + how to re-enable it.',
            );
            return;
          }
          prov.textContent = d.provider ?? '';
          const list = d.providers ?? [];
          sel.replaceChildren();
          for (const p of list) {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.label;
            if (p.def) {
              opt.selected = true;
              selectedProvider = p.id;
            }
            sel.appendChild(opt);
          }
          // Restore a previously-picked provider if it's still on offer.
          let saved: string | null = null;
          try {
            saved = localStorage.getItem('cqm-cop-provider');
          } catch {
            saved = null;
          }
          if (saved && list.some((p) => p.id === saved)) {
            sel.value = saved;
            selectedProvider = saved;
          }
          if (list.length === 0) sel.style.display = 'none';
        })
        .catch(() => {
          // No Bun server (static GitHub Pages, or the local server is down). The chat still works —
          // it calls the free key-less LLM7 directly from the browser. Only the repo tools
          // (/read /ls /grep /run) need `bun dev`. So: NOT a dead end — don't lock the input.
          prov.textContent = 'llm7 · static';
          sel.style.display = 'none';
          addMsg(
            'cqm-cop-sys',
            'Static build — no local server. The chat works (it calls the free LLM7 AI directly); ' +
              'just ask. Repo commands (/read /ls /grep /run) need `bun dev`. Click 🩺 for diagnostics.',
          );
        });
    }
  };

  toggle.addEventListener('click', () => {
    if (panel.classList.contains('open')) panel.classList.remove('open');
    else openPanel();
  });
  close.addEventListener('click', () => panel.classList.remove('open'));
  sel.addEventListener('change', () => {
    selectedProvider = sel.value;
    try {
      localStorage.setItem('cqm-cop-provider', sel.value);
    } catch {
      /* storage unavailable (private mode) — selection still works in-session */
    }
  });
  send.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      panel.classList.remove('open');
      toggle.focus();
    }
  });
}

// Self-mount once the DOM is ready (UI shell; safe to no-op if there is no document).
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
}

export {};
