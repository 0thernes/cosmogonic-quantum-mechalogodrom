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

const STYLE = `
#cqm-cop-toggle{position:fixed;right:10px;bottom:10px;z-index:60;width:42px;height:42px;border-radius:50%;
  border:1px solid rgba(120,160,220,.5);background:rgba(6,10,22,.82);color:#bcd2f5;font-size:19px;cursor:pointer;
  backdrop-filter:blur(6px);box-shadow:0 2px 14px rgba(0,0,0,.5);transition:transform .15s,background .15s}
#cqm-cop-toggle:hover{transform:scale(1.08);background:rgba(14,22,44,.92)}
#cqm-cop-toggle:focus-visible{outline:2px solid #6da8ff;outline-offset:2px}
#cqm-cop-panel{position:fixed;right:10px;bottom:62px;z-index:60;width:min(92vw,380px);height:min(72vh,560px);
  display:none;flex-direction:column;border:1px solid rgba(120,160,220,.4);border-radius:12px;
  background:rgba(4,8,18,.94);backdrop-filter:blur(10px);box-shadow:0 8px 40px rgba(0,0,0,.6);
  font:12px/1.5 var(--font-mono,ui-monospace,monospace);color:#cfe0fb;overflow:hidden}
#cqm-cop-panel.open{display:flex}
.cqm-cop-head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(120,160,220,.25);
  background:rgba(10,16,34,.7)}
.cqm-cop-head b{font-size:12px;letter-spacing:.08em;color:#9fc0ff}
.cqm-cop-prov{margin-left:auto;font-size:9px;opacity:.6}
.cqm-cop-x{background:none;border:none;color:#9fc0ff;font-size:16px;cursor:pointer;padding:0 4px}
.cqm-cop-log{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px}
.cqm-cop-msg{padding:6px 9px;border-radius:8px;white-space:pre-wrap;word-break:break-word}
.cqm-cop-user{align-self:flex-end;background:rgba(50,80,150,.4);max-width:88%}
.cqm-cop-ai{align-self:flex-start;background:rgba(20,30,56,.7);max-width:94%}
.cqm-cop-sys{align-self:center;font-size:10px;opacity:.65;text-align:center;max-width:96%}
.cqm-cop-tool{align-self:flex-start;max-width:96%;border-left:2px solid rgba(120,160,220,.5);
  background:rgba(8,14,30,.7);padding:5px 8px;border-radius:4px;font-size:10.5px;opacity:.92}
.cqm-cop-tool pre{margin:3px 0 0;max-height:170px;overflow:auto;white-space:pre-wrap;color:#a9c4ea}
.cqm-cop-foot{border-top:1px solid rgba(120,160,220,.25);padding:7px;display:flex;gap:6px}
.cqm-cop-foot textarea{flex:1;resize:none;height:38px;background:rgba(2,6,16,.9);color:#dceaff;
  border:1px solid rgba(120,160,220,.35);border-radius:6px;padding:6px 8px;font:inherit}
.cqm-cop-foot textarea:focus-visible{outline:1px solid #6da8ff}
.cqm-cop-send{background:rgba(50,90,170,.55);color:#dfeaff;border:1px solid rgba(120,160,220,.5);
  border-radius:6px;padding:0 12px;cursor:pointer;font:inherit}
.cqm-cop-send:disabled{opacity:.4;cursor:default}
.cqm-cop-hint{font-size:9px;opacity:.5;padding:0 10px 7px}
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
  const close = document.createElement('button');
  close.className = 'cqm-cop-x';
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close Copilot');
  head.append(title, prov, close);

  const logEl = document.createElement('div');
  logEl.className = 'cqm-cop-log';

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

  panel.append(head, logEl, foot, hint);
  document.body.append(toggle, panel);

  const history: Msg[] = [];
  let busy = false;
  let greeted = false;

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
        body: JSON.stringify({ messages: history }),
      });
      const data = (await res.json()) as AgentResult;
      thinking.remove();
      for (const step of data.steps ?? []) addTool(step);
      addMsg('cqm-cop-ai', data.reply || '(no answer)');
      history.push({ role: 'assistant', content: data.reply || '' });
    } catch (e) {
      thinking.remove();
      addMsg('cqm-cop-sys', `chat error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

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
        .then((r) => r.json() as Promise<{ provider?: string }>)
        .then((d) => {
          prov.textContent = d.provider ?? '';
        })
        .catch(() => {
          prov.textContent = 'offline';
        });
    }
  };

  toggle.addEventListener('click', () => {
    if (panel.classList.contains('open')) panel.classList.remove('open');
    else openPanel();
  });
  close.addEventListener('click', () => panel.classList.remove('open'));
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
