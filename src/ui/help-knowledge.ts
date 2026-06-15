/**
 * HELP KNOWLEDGE BASE (V36) — the repo-grounded RAG behind "HELP ME NOW". A curated, DOM-free corpus
 * of project knowledge (one card per topic, distilled from README/Docs/Specs/ENTITY-SHEETS) + a small
 * keyword retriever, so the help panel answers "Explain this / What is that? / I'm confused" instantly
 * and OFFLINE — no dependency on the external AI (which can be rate-limited). The ✦ Copilot still
 * handles freeform + web questions; this is the always-available, grounded first line.
 *
 * Safety constitution (baked in): every card here is PUBLIC project knowledge — architecture, science,
 * how-to-play. Nothing here is a secret, a credential, private data, or a sensitive matter, so a
 * grounded answer can never leak one. Pure + deterministic; unit-tested via {@link findHelp}.
 */

export interface HelpEntry {
  id: string;
  title: string;
  /** Extra match terms beyond the title/body words (synonyms, entity names). */
  keywords: string[];
  /** The grounded answer — plain text, a few sentences. */
  body: string;
  /** Where to read more (doc paths / panels). */
  see?: string[];
}

/** The corpus. Kept concise + accurate to the codebase; grows as the world does. */
export const HELP_KB: readonly HelpEntry[] = [
  {
    id: 'overview',
    title: 'What is this?',
    keywords: [
      'overview',
      'what is this',
      'explain this',
      'confused',
      'start',
      'cosmogonic',
      'sim',
      'game',
      'about',
    ],
    body: 'The Cosmogonic Quantum Mechalogodrom is a living chaos-biome simulation: thousands of procedural creatures drift, feed, mutate and trade inside a reactive cosmos, watched over by apex minds. Every visual effect sits on real math, and every system both reads and writes another — cognition feeds the economy, the economy steers war, war triggers sanctions. Open the panels from the menu bar (centered, just above the bottom toolbar) to inspect any layer live.',
    see: ['docs/PHILOSOPHY.md', 'README.md'],
  },
  {
    id: 'how-to-play',
    title: 'How do I play / what do the controls do?',
    keywords: [
      'controls',
      'how to play',
      'keys',
      'buttons',
      'mouse',
      'camera',
      'navigate',
      'confused',
      'lost',
    ],
    body: 'Drag to orbit the camera, scroll to zoom. The bottom toolbar cycles music, time-scale, render mode (wire/solid), view, weather, and cosmic events. The menu bar (centered, just above the bottom toolbar) opens the inspector panels: ⊞ NEURAL (an NHI mind), ⊙ MARKET (the economy), ⬢ ARCHITECT (the super creature), ✦ AI (chat), ❓ HELP, 🗒 AUDIT (the event log), and ⛓ ACCESS (the puzzle). Solve the puzzle to enter SUPERHERO mode.',
    see: ['index.html'],
  },
  {
    id: 'entities',
    title: 'What are all these creatures?',
    keywords: [
      'entities',
      'creatures',
      'what is that',
      'beings',
      'morphs',
      'archetypes',
      'population',
      'phyla',
    ],
    body: 'The biomass is instantiated from hundreds of deterministic morphotypes (10 phyla). Above them sit named powers: SHOGGOTHS (eldritch devourers), PUPPET-MASTERS (unseen hands that reshape the world), TITANS (ten colossi that ally and war), NHIs (apex super-minds), LEVIATHANS, and the SUPER CREATURE. Each has its own biology, silhouette, material, motion and economic role — see the bestiary. Up to 25,000 are active at once (V44 — retuned down from 50k so it does not crash mid-range machines), and each carries its own compact 70-parameter neural brain (V42) that perceives its state + the world and steers it — so every one moves with individual, reactive character.',
    see: ['docs/ENTITY-SHEETS.md'],
  },
  {
    id: 'super-creature',
    title: 'What is the SUPER CREATURE?',
    keywords: [
      'super creature',
      'architect',
      'omega',
      'apex',
      'god',
      'oracle',
      'simulator',
      'twin',
    ],
    body: 'The always-active apex being (ARCHITECT-Ω) — half a Titan but ~100× the power, driven by a genuine 1444-parameter deep neural mind (cortex→actor) with an emotion-like state, episodic memory, a prediction loop, GOAP planning, and self-replication (up to 3 mutated twins). It wears a masterful many-eyed god-jewel body and FLIES the whole world — roaming, banking, quantum-teleporting and morphing as it thinks (no longer a static centerpiece). Open the ⬢ ARCHITECT panel to watch its mind live.',
    see: ['docs/adr/0008-super-creature-deep-mind.md', 'docs/ENTITY-SHEETS.md'],
  },
  {
    id: 'access-puzzle',
    title: 'How do I solve the ACCESS puzzle?',
    keywords: [
      'access',
      'puzzle',
      'code',
      'romans',
      'roman',
      'cipher',
      'unlock',
      'denied',
      'crack',
      'hint',
    ],
    body: 'Open ⛓ ACCESS. The ten cipher lines each carry a count of tally marks — that count IS a digit of the hidden seed. "Only the Romans know": read each line\'s count and speak it as a Roman numeral (I–X). The answer is III IV V V IV V VI VII V IV (the raw digits 3455456754 also work). Solving it unlocks SUPERHERO mode + the 2nd super creature.',
    see: ['src/ui/access-puzzle.ts'],
  },
  {
    id: 'superhero',
    title: 'What is SUPERHERO mode?',
    keywords: [
      'superhero',
      'player',
      'powers',
      'level',
      'xp',
      'inventory',
      'fork',
      'phase',
      'progression',
      'controls',
      'camera',
      'autopilot',
      'manual',
      'first person',
      'third person',
    ],
    body: 'Solving the access puzzle drops you INTO the 2nd super creature. A top game HUD appears with life/energy/XP-level bars, stats, wallet, neural meters, inventory and four quantum POWERS: PHASE (cycle render-state), DOMINION (pulse), QUANTUM FORK (sire a twin, energy-gated, up to 3), and RECALL. You earn XP just by existing as a dominant apex. CONTROLS (V41): the PILOT button cycles three modes — AUTOPILOT (the creature flies itself for the fun ride), ASSIST (it roams but your input nudges it), and MANUAL (you fly it). The CAMERA button cycles ORBIT (free world cam) → 3RD-PERSON (chase) → 1ST-PERSON (its eyes). In assist/manual, fly with WASD/QE + arrow keys or the on-screen D-pad (touch-friendly); movement is camera-relative.',
    see: ['src/ui/superhero-hud.ts'],
  },
  {
    id: 'economy',
    title: 'How does the economy work?',
    keywords: [
      'economy',
      'market',
      'money',
      'currency',
      'aurum',
      'umbra',
      'quanta',
      'ichor',
      'trade',
      'wallet',
      'wealth',
      'price',
      'cartel',
      'auction',
    ],
    body: 'Every power has a wallet in two currencies (AURUM ☉, UMBRA ☾) and two commodities (QUANTA ◇, ICHOR ❖). Prices clear by tâtonnement; a currency-adoption game shifts dominance; the richest few form a cartel; arbitrage mean-reverts the price gap; titan wars trigger sanctions and a black market; windfalls are sold by second-price (Vickrey) auction. Wealth drives behaviour — rich creatures hunt harder and loom larger. Open ⊙ MARKET.',
    see: ['src/sim/economy.ts', 'docs/ENTITY-SHEETS.md'],
  },
  {
    id: 'math',
    title: 'What math powers this?',
    keywords: [
      'math',
      'science',
      'physics',
      'algorithms',
      'game theory',
      'nash',
      'fourier',
      'chaos',
      'topology',
      'how does it work',
    ],
    body: "Real math under every effect: seeded PRNGs for determinism, tiny neural nets (perceptrons/MLPs) for cognition, game theory (iterated prisoner's dilemma, Nash, Vickrey auctions, replicator dynamics) for diplomacy + markets, Louvain community detection for tribes, reaction-diffusion + Lorenz/chaos fields for motion, fBm noise + thin-film optics in the shaders, and Jolt rigid-body physics in the native engine.",
    see: ['docs/adr/0005-math-stack-selection.md'],
  },
  {
    id: 'observatory',
    title: 'What is the NEURAL observatory?',
    keywords: ['observatory', 'neural', 'nhi', 'mind', 'connectome', 'brain', 'firing', 'topology'],
    body: "The ⊞ NEURAL panel opens a 3×3 grid of nine scientific diagrams of a launched NHI's live mind — firing activity, network topology, memory pathways, reward gradients, sensory inputs, intention vectors, affect, prediction loops, and the decision/conflict map. Each is bound to a real internal variable of the NHI's think() step, animated as it reasons.",
    see: ['src/ui/nhi-observatory.ts'],
  },
  {
    id: 'ai-copilot',
    title: 'How do I ask the AI freeform questions?',
    keywords: ['ai', 'copilot', 'chat', 'web', 'search', 'ask', 'help me now', 'question'],
    body: 'This HELP panel answers common questions instantly from a built-in, repo-grounded knowledge base (no network needed). For freeform questions, code reading, or public web info, open the ✦ AI (Copilot) — a read-only assistant that grounds answers in the actual repo (read_file/grep/run) AND can now SEARCH THE PUBLIC WEB (V43) for outside knowledge (science, math, history) via a screened, key-less endpoint, citing its source. A safety constitution (inspired by Anthropic/OpenAI/Gemini/Grok) keeps it to public/educational info only — never secrets, private data, or harmful requests. It runs free providers in a failover chain — FreeLLMAPI (a self-hosted 16-provider pool) is the primary if you run it (localhost:3001), with the key-less LLM7 and Pollinations as automatic 2nd/3rd backups, so the box answers even with zero setup. If the AI is offline, its 🩺 diagnostics show why and how to recover.',
    see: ['src/ui/copilot.ts', 'src/server/web-search.ts'],
  },
  {
    id: 'determinism',
    title: 'Is it the same every time? (determinism)',
    keywords: ['determinism', 'random', 'seed', 'reproducible', 'rng', 'same'],
    body: "Yes — one seed reproduces a whole run, byte for byte. All simulation randomness flows through a seeded mulberry32 PRNG; Math.random and Date.now are banned in sim logic. New systems (economy, super creature) draw from isolated sub-streams so they never perturb the core golden. This is the repo's #1 law.",
    see: ['src/math/rng.ts', 'docs/adr/0004-deterministic-rng.md'],
  },
  {
    id: 'architecture',
    title: 'How is the code organized?',
    keywords: [
      'architecture',
      'code',
      'files',
      'structure',
      'modules',
      'native',
      'engine',
      'build',
    ],
    body: 'A TypeScript + three.js browser app (src/): sim/ holds the world systems (entities, economy, cognition, super creature), ui/ the self-mounting panels, math/ the primitives. A sibling native/ C++20 engine ray-marches the ornate specimens with Jolt physics. Everything passes a full gate (prettier → tsc → oxlint → tests → build) before commit.',
    see: ['CLAUDE.md', 'docs/MODULE-CONTRACTS.md'],
  },
  {
    id: 'performance',
    title: 'Why is it smooth with so many creatures? (performance)',
    keywords: [
      'performance',
      'fps',
      'lag',
      'optimization',
      'instancing',
      'lod',
      'fast',
      'slow',
      'speed',
    ],
    body: 'Creatures render through GPU-instanced pools (one draw call per geometry), a spatial hash for neighbour queries, and cadenced heavy work (the connectome, economy and graph passes run on slow frames that scale with population). Quality auto-detects the device tier. Telemetry tracks it all live in the ⊞ panels.',
    see: ['docs/BENCHMARKS.md'],
  },
];

const STOP = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'do',
  'does',
  'i',
  'how',
  'what',
  'why',
  'this',
  'that',
  'it',
  'to',
  'of',
  'in',
  'on',
  'and',
  'or',
  'me',
  'my',
  'with',
  'for',
  'can',
  'about',
  'all',
  'these',
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/**
 * Rank the KB against a free-text query by keyword/title/body overlap. Returns the best matches
 * (score > 0), highest first, capped at `limit`. Deterministic; O(kb · query tokens). Empty query
 * (or no match) → []. The panel falls back to the overview card on empty results.
 */
export function findHelp(
  query: string,
  kb: readonly HelpEntry[] = HELP_KB,
  limit = 3,
): HelpEntry[] {
  const qs = tokens(query);
  if (qs.length === 0) return [];
  const scored = kb.map((e) => {
    const kw = new Set(e.keywords.flatMap((k) => tokens(k)));
    const title = new Set(tokens(e.title));
    const body = new Set(tokens(e.body));
    let score = 0;
    for (const q of qs) {
      if (kw.has(q)) score += 3;
      if (title.has(q)) score += 2;
      if (body.has(q)) score += 1;
    }
    // a multi-word keyword phrase appearing verbatim is a strong signal
    const ql = query.toLowerCase();
    for (const k of e.keywords) if (k.includes(' ') && ql.includes(k)) score += 4;
    return { e, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.e);
}
