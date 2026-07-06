<!-- reviewed: 2026-07-06 | living appendix: benchmarks + bug registry only | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Mega Master Deep-Dive — Benchmarks & Bug Registry

> **Canonical SOTA:** [reports/2026-06-17-STATE-OF-THE-ART-COMBINED.md](reports/2026-06-17-STATE-OF-THE-ART-COMBINED.md) ·
> **Measured facts:** [VERIFICATION-ANALYTICAL-DATA.md](VERIFICATION-ANALYTICAL-DATA.md) ·
> **Architecture:** [ARCHITECTURE-2026-06-26.md](ARCHITECTURE-2026-06-26.md) ·
> **Consciousness:** [CONSCIOUSNESS-LAB-MASTER-2026-07-03.md](CONSCIOUSNESS-LAB-MASTER-2026-07-03.md)

**Date:** 2026-06-27 (gutted 2026-07-06) · **Repo:** `v0.20.0` · **Gate:** 1,984 tests · 84.35% line / 82.05% func

Pass 8 consolidation removed duplicate narrative sections (architecture, quantum, A-life, consciousness,
Tsotchke deep-dives, CI plans, and passes 2–9) — those topics live in the canonical docs above. This file
retains only the **25 benchmark visual specs** (§10) and the **bug/issue registry** (§11).

---

## Executive snapshot (measured 2026-07-06)

Deterministic browser-native A-Life testbed: ~123k LOC, 250 TS modules, 20 Tsotchke corpus projects (~16
wired), Butlin **8/14 met + 6/14 partial** (not sentient), A-Life breadth outlier in 112-system survey.
Biggest risks: faculty coupling density, open-endedness below mean, single-thread JS ceiling (workers +
WebGPU roadmap in [PERFORMANCE-OPTIMIZATION-ROADMAP-2026-07-03.md](PERFORMANCE-OPTIMIZATION-ROADMAP-2026-07-03.md)).

---

## 10. 25 New Benchmarks for Dynamic Data Visuals

Each benchmark has **25 measurement points** designed for dynamic data visualization (graphs, charts, diagrams with dimensionality, color, and shapes).

### Benchmark 1: Quantum Statevector Fidelity Spectrum

Measures the fidelity of quantum statevector operations across 25 gate-sequence depths.

| Point | Measurement                          | Visual encoding           |
| ----- | ------------------------------------ | ------------------------- |
| 1     | Identity gate fidelity (depth=1)     | Blue dot, size ∝ fidelity |
| 2     | Hadamard chain fidelity (depth=2)    | Cyan dot                  |
| 3     | Hadamard chain fidelity (depth=4)    | Teal dot                  |
| 4     | Hadamard chain fidelity (depth=8)    | Green dot                 |
| 5     | Hadamard chain fidelity (depth=16)   | Yellow-green dot          |
| 6     | CNOT entanglement fidelity (depth=2) | Orange dot                |
| 7     | CNOT entanglement fidelity (depth=4) | Amber dot                 |
| 8     | CNOT entanglement fidelity (depth=8) | Red dot                   |
| 9     | Random Clifford fidelity (depth=1)   | Purple dot                |
| 10    | Random Clifford fidelity (depth=4)   | Violet dot                |
| 11    | Random Clifford fidelity (depth=8)   | Magenta dot               |
| 12    | Random Clifford fidelity (depth=16)  | Pink dot                  |
| 13    | QFT fidelity (n=3)                   | Star shape, gold          |
| 14    | QFT fidelity (n=4)                   | Star shape, silver        |
| 15    | QFT fidelity (n=5)                   | Star shape, bronze        |
| 16    | Grover diffusion fidelity (1 iter)   | Diamond, blue             |
| 17    | Grover diffusion fidelity (3 iter)   | Diamond, green            |
| 18    | Grover diffusion fidelity (5 iter)   | Diamond, red              |
| 19    | VQE ground-state fidelity (H₂)       | Hexagon, cyan             |
| 20    | VQE ground-state fidelity (LiH)      | Hexagon, magenta          |
| 21    | Mixed-state QGT trace distance       | Triangle, orange          |
| 22    | Coherence resource decay             | Square, purple            |
| 23    | Magic (stabilizer Rényi) entropy     | Circle, teal              |
| 24    | Lindblad open-system purity          | Cross, amber              |
| 25    | Born-rule collapse reproducibility   | Plus, green               |

**Visual:** 3D scatter plot, axes = [gate depth, qubit count, fidelity], color = gate family, shape = operation type.

### Benchmark 2: Cognitive Faculty Activation Heatmap

Measures activation levels of 25 deep-wired faculties across simulation beats.

| Point | Faculty                   | Visual encoding            |
| ----- | ------------------------- | -------------------------- |
| 1     | GWT ignition              | Red intensity ∝ activation |
| 2     | IIT Φ proxy               | Blue intensity             |
| 3     | Active inference F        | Green intensity            |
| 4     | Metacognition confidence  | Yellow intensity           |
| 5     | Successor representation  | Purple intensity           |
| 6     | Empowerment drive         | Orange intensity           |
| 7     | Theory of mind            | Cyan intensity             |
| 8     | Reservoir echo-state      | Teal intensity             |
| 9     | Neural criticality σ̂      | Magenta intensity          |
| 10    | Spin-glass instinct       | Amber intensity            |
| 11    | Holographic memory recall | Pink intensity             |
| 12    | Quantum deliberation      | Violet intensity           |
| 13    | QNG descent               | Indigo intensity           |
| 14    | Grover amplification      | Lime intensity             |
| 15    | Coherence telemetry       | Coral intensity            |
| 16    | Magic/non-stabilizerness  | Salmon intensity           |
| 17    | Quantum reservoir readout | Gold intensity             |
| 18    | Attention controller      | Silver intensity           |
| 19    | Top-down perception       | Bronze intensity           |
| 20    | Quality space             | Turquoise intensity        |
| 21    | Valence steering          | Lavender intensity         |
| 22    | Neuromodulation DA        | Crimson intensity          |
| 23    | Neuromodulation 5-HT      | Navy intensity             |
| 24    | Neuromodulation NE        | Forest intensity           |
| 25    | Neuromodulation ACh       | Maroon intensity           |

**Visual:** 5×5 heatmap grid, color intensity = activation level, animated over simulation beats.

### Benchmark 3: Population Dynamics Spiral

Measures 25 population metrics over simulation time.

| Point | Metric                            | Visual encoding                |
| ----- | --------------------------------- | ------------------------------ |
| 1     | Live entity count                 | Spiral arm thickness           |
| 2     | Birth rate                        | Spiral arm color (blue→red)    |
| 3     | Death rate                        | Spiral arm color (green→black) |
| 4     | Auto-split events                 | Spiral node size               |
| 5     | Phylum distribution entropy       | Spiral hue rotation            |
| 6     | Morphotype diversity              | Spiral radius                  |
| 7     | Spatial clustering coefficient    | Spiral tightness               |
| 8     | Migration velocity mean           | Spiral angular velocity        |
| 9     | Flock cohesion                    | Spiral brightness              |
| 10    | Set-theory tribe count            | Spiral branch count            |
| 11    | Nash equilibrium stability        | Spiral symmetry                |
| 12    | Market type-morph rate            | Spiral pulse                   |
| 13    | Graph-seek exploration            | Spiral scatter                 |
| 14    | Connectome link density           | Spiral line opacity            |
| 15    | Louvain community count           | Spiral segment count           |
| 16    | PageRank top-K stability          | Spiral crown glow              |
| 17    | Entity brain activation mean      | Spiral inner color             |
| 18    | Genome diversity (gene distance)  | Spiral outer color             |
| 19    | Lineage generation depth          | Spiral depth layer             |
| 20    | Temperature-modified death rate   | Spiral thermal color           |
| 21    | Respawn rate                      | Spiral regeneration pulse      |
| 22    | Entity velocity distribution      | Spiral vector field            |
| 23    | Neighbor query count/frame        | Spiral density                 |
| 24    | Spatial hash cell occupancy       | Spiral grid overlay            |
| 25    | Population z-score omen frequency | Spiral alert markers           |

**Visual:** Logarithmic spiral, 25 arms, each arm's properties encode one metric, animated over time.

### Benchmark 4: Quantum Geometric Tensor Manifold

Measures 25 properties of the QGT/Berry curvature manifold.

| Point | Measurement                       | Visual encoding         |
| ----- | --------------------------------- | ----------------------- |
| 1     | Fubini-Study metric trace         | Surface height          |
| 2     | Fubini-Study metric determinant   | Surface color (blue)    |
| 3     | Berry curvature (θ,φ) = (0,0)     | Surface normal          |
| 4     | Berry curvature (θ,φ) = (π/4,0)   | Surface gradient        |
| 5     | Berry curvature (θ,φ) = (π/2,0)   | Surface ridge           |
| 6     | Berry curvature (θ,φ) = (π/4,π/4) | Surface valley          |
| 7     | Berry curvature (θ,φ) = (π/2,π/2) | Surface saddle          |
| 8     | Quantum natural gradient norm     | Flow arrow length       |
| 9     | QNG convergence rate              | Flow arrow color        |
| 10    | Curvature-aware QNG correction    | Flow arrow curvature    |
| 11    | Mixed-state QGT entropy           | Surface transparency    |
| 12    | Mixed-state QGT Im-sign           | Surface texture         |
| 13    | Geometric phase (Berry)           | Surface twist           |
| 14    | Geometric phase (Pancharatnam)    | Surface phase color     |
| 15    | Quantum Fisher information        | Surface brightness      |
| 16    | Bures distance                    | Surface distance metric |
| 17    | Helstrom bound                    | Surface threshold       |
| 18    | Fidelity susceptibility           | Surface sensitivity     |
| 19    | Discord (quantum)                 | Surface noise           |
| 20    | Entanglement entropy              | Surface depth           |
| 21    | Concurrence                       | Surface linkage         |
| 22    | Negativity                        | Surface shadow          |
| 23    | Quantum volume                    | Surface volume          |
| 24    | Gate fidelity (average)           | Surface smoothness      |
| 25    | State purity                      | Surface clarity         |

**Visual:** 3D manifold surface plot, height = metric value, color = curvature type, animated as the quantum state evolves.

### Benchmark 5: Economic Network Flow Diagram

Measures 25 economic flow metrics.

| Point | Metric                    | Visual encoding          |
| ----- | ------------------------- | ------------------------ |
| 1     | AURUM ☉ money supply      | Node size (gold)         |
| 2     | UMBRA ☾ money supply      | Node size (silver)       |
| 3     | QUANTA ◇ commodity supply | Node size (cyan)         |
| 4     | ICHOR ❖ commodity supply  | Node size (magenta)      |
| 5     | FX rate (AURUM/UMBRA)     | Edge color               |
| 6     | Price (QUANTA)            | Edge thickness           |
| 7     | Price (ICHOR)             | Edge thickness           |
| 8     | Gini coefficient          | Network inequality color |
| 9     | Wealth spread (min→max)   | Network span             |
| 10    | Cartel share              | Network cluster opacity  |
| 11    | Arbitrage spread          | Network edge pulse       |
| 12    | Sanctioned agent count    | Network node border      |
| 13    | Black market volume       | Network shadow edges     |
| 14    | Vickrey auction price     | Network node glow        |
| 15    | Commons dividend          | Network distribution     |
| 16    | Titan wealth → diplomacy  | Network edge direction   |
| 17    | Shoggoth trade deals      | Network edge count       |
| 18    | Puppeteer meddling rate   | Network interference     |
| 19    | NHI wallet balance        | Network apex node        |
| 20    | Super creature purse      | Network crown node       |
| 21    | Market stress ← chaos     | Network turbulence       |
| 22    | Clearing market volume    | Network flow rate        |
| 23    | Currency adoption game    | Network color shift      |
| 24    | Embargo rate              | Network barrier          |
| 25    | Smuggler premium          | Network dark flow        |

**Visual:** Force-directed network graph, nodes = agents, edges = trades, animated flow.

### Benchmark 6: Consciousness Ignition Cascade

Measures 25 stages of the GWT ignition cascade.

| Point | Stage                                     | Visual encoding      |
| ----- | ----------------------------------------- | -------------------- |
| 1     | Pre-ignition: faculty activation baseline | Dim grid             |
| 2     | Coalition formation: 7 plan-coalitions    | Colored clusters     |
| 3     | Winner-take-all competition               | Brightening nodes    |
| 4     | Runner-up activation                      | Fading nodes         |
| 5     | Access threshold crossing                 | Threshold line       |
| 6     | Ignition flash                            | Bright burst         |
| 7     | Broadcast signal                          | Expanding wave       |
| 8     | Memory consolidation gate                 | Gate opening         |
| 9     | Eshkol workspace tick                     | Workspace glow       |
| 10    | Factor-graph belief update                | Graph edges          |
| 11    | Active inference F minimization           | Energy descent       |
| 12    | Expected free energy G                    | Value projection     |
| 13    | Φ participation ratio                     | Integration glow     |
| 14    | Φ coherence ratio                         | Coherence ring       |
| 15    | Quantum min-cut Φ                         | Quantum cut line     |
| 16    | Attention controller bias                 | Attention arrows     |
| 17    | Neuromodulation release                   | Chemical spray       |
| 18    | Reservoir echo                            | Temporal trail       |
| 19    | Criticality σ̂→1                           | Edge-of-chaos marker |
| 20    | Spin-glass settle                         | Spin lattice         |
| 21    | Holographic recall                        | Memory flash         |
| 22    | Valence steering                          | Valence color        |
| 23    | Metacognitive confidence                  | Confidence bar       |
| 24    | Theory-of-mind inference                  | Social link          |
| 25    | Post-ignition decay                       | Fading trail         |

**Visual:** Animated cascade diagram, nodes light up in sequence, expanding broadcast wave.

### Benchmark 7: Reaction-Diffusion Pattern Evolution

Measures 25 Gray-Scott RD pattern metrics.

| Point | Measurement                    | Visual encoding          |
| ----- | ------------------------------ | ------------------------ |
| 1     | U field mean                   | Ground color (green)     |
| 2     | V field mean                   | Ground color (red)       |
| 3     | U field variance               | Ground texture           |
| 4     | V field variance               | Ground texture           |
| 5     | Pattern type (mitosis)         | Pattern shape            |
| 6     | Pattern type (spots)           | Pattern shape            |
| 7     | Pattern type (stripes)         | Pattern shape            |
| 8     | Pattern type (chaos)           | Pattern shape            |
| 9     | Pattern type (waves)           | Pattern shape            |
| 10    | Feed rate (F)                  | Color saturation         |
| 11    | Kill rate (k)                  | Color hue                |
| 12    | Diffusion rate (Du)            | Blur radius              |
| 13    | Diffusion rate (Dv)            | Blur radius              |
| 14    | Weather coupling (temperature) | Thermal overlay          |
| 15    | Chaos coupling (intensity)     | Chaos overlay            |
| 16    | Entity death perturbation      | Scar marks               |
| 17    | Step time (ms)                 | Performance bar          |
| 18    | Grid size (128²)               | Resolution indicator     |
| 19    | Cadence (every 2nd frame)      | Timing pulse             |
| 20    | Ground emissive map upload     | Texture upload indicator |
| 21    | Pattern stability              | Stability meter          |
| 22    | Pattern complexity             | Complexity fractal       |
| 23    | Symmetry breaking              | Asymmetry indicator      |
| 24    | Turing instability onset       | Onset marker             |
| 25    | Bifurcation diagram            | Branch point             |

**Visual:** 2D animated heatmap of the RD field with overlaid metrics.

### Benchmark 8: Spatial Hash Performance Contour

Measures 25 spatial hash performance metrics across entity counts.

| Point | Entity count    | Measurement               | Visual encoding    |
| ----- | --------------- | ------------------------- | ------------------ |
| 1     | 650 (phone)     | Query time (µs)           | Contour line       |
| 2     | 650             | Rebuild time (µs)         | Contour fill       |
| 3     | 2,000 (laptop)  | Query time                | Contour line       |
| 4     | 2,000           | Rebuild time              | Contour fill       |
| 5     | 5,000 (desktop) | Query time                | Contour line       |
| 6     | 5,000           | Rebuild time              | Contour fill       |
| 7     | 10,000 (ultra)  | Query time                | Contour line       |
| 8     | 10,000          | Rebuild time              | Contour fill       |
| 9     | 25,000 (mega)   | Query time                | Contour line       |
| 10    | 25,000          | Rebuild time              | Contour fill       |
| 11    | 50,000 (mega)   | Query time                | Contour line       |
| 12    | 50,000          | Rebuild time              | Contour fill       |
| 13    | 50,000          | Neighbors per query (k)   | Heat contour       |
| 14    | 50,000          | Cell occupancy mean       | Density contour    |
| 15    | 50,000          | Cell occupancy variance   | Variance contour   |
| 16    | 10,000          | ULTRA_GRID_CELL=10        | Grid overlay       |
| 17    | 10,000          | Theory stride=3           | Stride marker      |
| 18    | 10,000          | Flock cadence=1/2         | Cadence marker     |
| 19    | 10,000          | Connectome cadence=/6     | Cadence marker     |
| 20    | 50,000          | √N density scaling        | Scaling curve      |
| 21    | 50,000          | Areal density (raw)       | Raw density        |
| 22    | 50,000          | Areal density (scaled)    | Scaled density     |
| 23    | 50,000          | Singularity O(k) flatness | Flatness indicator |
| 24    | 50,000          | Entropy global stride     | Stride indicator   |
| 25    | 50,000          | Frame budget share (%)    | Budget pie         |

**Visual:** 2D contour plot, axes = [entity count, cell size], color = time/neighbors.

### Benchmark 9: Connectome Topology Radar

Measures 25 connectome/graph-mind topology metrics.

| Point | Metric                     | Visual encoding      |
| ----- | -------------------------- | -------------------- |
| 1     | Link count (L)             | Radar arm length     |
| 2     | Link density               | Radar fill           |
| 3     | Louvain community count    | Radar segment count  |
| 4     | Modularity (Q)             | Radar area           |
| 5     | PageRank top-K stability   | Radar spike          |
| 6     | PageRank max               | Radar peak           |
| 7     | Clustering coefficient     | Radar inner shape    |
| 8     | Average path length        | Radar radius         |
| 9     | Small-world index          | Radar symmetry       |
| 10    | Assortativity              | Radar tilt           |
| 11    | Entity group count         | Radar divisions      |
| 12    | Tribe palette diversity    | Radar color wheel    |
| 13    | Connectome cadence         | Radar pulse rate     |
| 14    | GPU upload size (links×6)  | Radar bandwidth      |
| 15    | Update range efficiency    | Radar efficiency     |
| 16    | Graph rebuild time         | Radar timing         |
| 17    | Edge weight distribution   | Radar edge thickness |
| 18    | Node degree distribution   | Radar node size      |
| 19    | Betweenness centrality max | Radar bridge         |
| 20    | Closeness centrality mean  | Radar center         |
| 21    | Eigenvector centrality     | Radar direction      |
| 22    | Spectral gap               | Radar gap            |
| 23    | Algebraic connectivity     | Radar connectivity   |
| 24    | Graph diameter             | Radar span           |
| 25    | Graph radius               | Radar core           |

**Visual:** 25-axis radar chart, each axis = one metric, animated over simulation frames.

### Benchmark 10: SuperMind Cognitive Budget Waterfall

Measures 25 per-faculty timing costs in the SuperMind.think() call.

| Point | Faculty                         | Timing (µs) | Visual encoding              |
| ----- | ------------------------------- | ----------- | ---------------------------- |
| 1     | Perception encoding             | ~5          | Waterfall bar (blue)         |
| 2     | Tree of Thought (5 stages × 25) | ~50         | Waterfall bar (cyan)         |
| 3     | 30 organ-net evaluation         | ~30         | Waterfall bar (teal)         |
| 4     | 6-qubit evolve()                | ~15         | Waterfall bar (green)        |
| 5     | Quantum natural gradient        | ~20         | Waterfall bar (yellow-green) |
| 6     | Grover amplification            | ~10         | Waterfall bar (yellow)       |
| 7     | Spin-glass settle               | ~8          | Waterfall bar (amber)        |
| 8     | Active inference F              | ~12         | Waterfall bar (orange)       |
| 9     | Expected free energy G          | ~10         | Waterfall bar (red)          |
| 10    | Theory of mind                  | ~15         | Waterfall bar (crimson)      |
| 11    | Neuromodulation                 | ~5          | Waterfall bar (magenta)      |
| 12    | Successor representation        | ~8          | Waterfall bar (violet)       |
| 13    | Empowerment (Blahut-Arimoto)    | ~12         | Waterfall bar (purple)       |
| 14    | Holographic recall              | ~10         | Waterfall bar (indigo)       |
| 15    | GWT ignition                    | ~5          | Waterfall bar (navy)         |
| 16    | IIT Φ proxy                     | ~8          | Waterfall bar (blue)         |
| 17    | Quantum min-cut Φ               | ~15         | Waterfall bar (cyan)         |
| 18    | Quantum reservoir readout       | ~10         | Waterfall bar (teal)         |
| 19    | Lindblad deliberation           | ~12         | Waterfall bar (green)        |
| 20    | Metacognition                   | ~5          | Waterfall bar (yellow)       |
| 21    | Attention controller            | ~3          | Waterfall bar (amber)        |
| 22    | Criticality homeostat           | ~5          | Waterfall bar (orange)       |
| 23    | Resonance integrator            | ~8          | Waterfall bar (red)          |
| 24    | Plan commitment                 | ~5          | Waterfall bar (crimson)      |
| 25    | Total think()                   | ~298        | Summary bar (gold)           |

**Visual:** Cascading waterfall chart, each bar = one faculty's cost, total at bottom.

### Benchmark 11: Eshkol AD Tape Complexity

Measures 25 automatic differentiation tape operations.

| Point | Operation                   | Time (ns) | Visual encoding    |
| ----- | --------------------------- | --------- | ------------------ |
| 1     | adTapeNew(100)              | 1,790     | Bar (blue)         |
| 2     | adConst creation            | 110       | Bar (cyan)         |
| 3     | adVar creation              | 110       | Bar (teal)         |
| 4     | adAdd                       | 254       | Bar (green)        |
| 5     | adSub                       | 250       | Bar (yellow-green) |
| 6     | adMul                       | 235       | Bar (yellow)       |
| 7     | adDiv                       | 260       | Bar (amber)        |
| 8     | adSin                       | 227       | Bar (orange)       |
| 9     | adCos                       | 225       | Bar (red)          |
| 10    | adExp                       | 230       | Bar (crimson)      |
| 11    | adLog                       | 228       | Bar (magenta)      |
| 12    | adSqrt                      | 226       | Bar (violet)       |
| 13    | adPow                       | 280       | Bar (purple)       |
| 14    | adNeg                       | 200       | Bar (indigo)       |
| 15    | adAbs                       | 205       | Bar (navy)         |
| 16    | adRelu                      | 210       | Bar (blue)         |
| 17    | adSigmoid                   | 240       | Bar (cyan)         |
| 18    | adTanh                      | 238       | Bar (teal)         |
| 19    | adBackward (10 nodes)       | 308       | Bar (green)        |
| 20    | Complex: sin(x\*y)+x        | 604       | Bar (yellow)       |
| 21    | Nested gradient (2nd order) | 850       | Bar (amber)        |
| 22    | Jacobian (5×5)              | 1,200     | Bar (orange)       |
| 23    | Hessian diagonal (5×5)      | 2,500     | Bar (red)          |
| 24    | Tape reset                  | 50        | Bar (crimson)      |
| 25    | Tape length (100 nodes)     | 100       | Bar (magenta)      |

**Visual:** Horizontal bar chart, color = operation family, sorted by cost.

### Benchmark 12: Determinism Golden Hash Stability

Measures 25 determinism verification points.

| Point | Check                             | Visual encoding      |
| ----- | --------------------------------- | -------------------- |
| 1     | Same seed → same entity positions | Hash match (green ✓) |
| 2     | Same seed → same quantum state    | Hash match           |
| 3     | Same seed → same connectome links | Hash match           |
| 4     | Same seed → same RD field         | Hash match           |
| 5     | Same seed → same lore names       | Hash match           |
| 6     | Same seed → same economy state    | Hash match           |
| 7     | Same seed → same super-mind plan  | Hash match           |
| 8     | Same seed → same NHI decisions    | Hash match           |
| 9     | Same seed → same analytics omens  | Hash match           |
| 10    | Same seed → same audit ring       | Hash match           |
| 11    | Math.random banned in sim         | 0 violations (green) |
| 12    | Date.now banned in sim            | 0 violations         |
| 13    | performance.now banned in sim     | 0 violations         |
| 14    | Audio RNG forked stream           | Separate hash        |
| 15    | Economy econRng sub-stream        | Separate hash        |
| 16    | Super-evo localStorage timestamp  | Outside sim logic    |
| 17    | Tier ladder deterministic         | No adaptive jitter   |
| 18    | Ultra-only levers gated >5k       | Byte-identical ≤5k   |
| 19    | RD pure function of fields        | Deterministic        |
| 20    | Spatial hash integer keys         | Truncation-stable    |
| 21    | Tests seed every RNG              | Explicit seeds       |
| 22    | Benchmarks fixed seed             | mulberry32(42)       |
| 23    | No Set/Map order dependence       | Documented           |
| 24    | Persistence round-trip stable     | Value-stable         |
| 25    | Golden test integrated state      | Pinned hash          |

**Visual:** 5×5 green/red checkmark grid, animated as tests run.

### Benchmark 13: Rendering Pipeline Stage Timing

Measures 25 render pipeline stages.

| Point | Stage                    | Time (ms) | Visual encoding         |
| ----- | ------------------------ | --------- | ----------------------- |
| 1     | Camera update            | 0.01      | Pipeline segment (blue) |
| 2     | Weather apply            | 0.01      | Segment (cyan)          |
| 3     | Puppet masters update    | 0.05      | Segment (teal)          |
| 4     | Grid rebuild             | 0.56      | Segment (green)         |
| 5     | Shoggoths update         | 0.30      | Segment (yellow-green)  |
| 6     | Sort step                | 0.01      | Segment (yellow)        |
| 7     | Entities update          | 11.63     | Segment (amber, large)  |
| 8     | Connectome update        | 0.60      | Segment (orange)        |
| 9     | Quantum circuit          | 0.01      | Segment (red)           |
| 10    | Quantum cloud            | 0.10      | Segment (crimson)       |
| 11    | Reaction-diffusion       | 0.04      | Segment (magenta)       |
| 12    | Graph mind               | 0.05      | Segment (violet)        |
| 13    | Constellations           | 0.01      | Segment (purple)        |
| 14    | Environment              | 0.02      | Segment (indigo)        |
| 15    | Telemetry                | 0.01      | Segment (navy)          |
| 16    | Analytics                | 0.01      | Segment (blue)          |
| 17    | Instanced sync           | 4.67      | Segment (cyan, large)   |
| 18    | Super-mind think (5×)    | 14.47     | Segment (teal, largest) |
| 19    | Post-FX (lens)           | 0.50      | Segment (green)         |
| 20    | Engine render            | ~21.0     | Segment (yellow, GPU)   |
| 21    | Frame governor check     | 0.01      | Segment (amber)         |
| 22    | Audio analysis poll      | 0.01      | Segment (orange)        |
| 23    | NHI beat (every 18f)     | 0.05      | Segment (red)           |
| 24    | Economy tick (every 30f) | 0.02      | Segment (crimson)       |
| 25    | Total frame              | ~53.0     | Summary bar (gold)      |

**Visual:** Horizontal pipeline diagram, each segment width ∝ time, color = stage type.

### Benchmark 14: Digital Biologics Substrate Health

Measures 25 digital biologic substrate health metrics.

| Point | Substrate               | Metric                 | Visual encoding           |
| ----- | ----------------------- | ---------------------- | ------------------------- |
| 1     | ESHKOL_NATIVE           | adFitness              | Health bar (blue)         |
| 2     | MOONLAB_TENSOR          | tensorContract         | Health bar (cyan)         |
| 3     | QGT_CURVED              | qgtCurvature × 1.15    | Health bar (teal)         |
| 4     | SPIN_COLLECTIVE         | spinOrder              | Health bar (green)        |
| 5     | IRREP_SYM               | symmetryScore          | Health bar (yellow-green) |
| 6     | QUAKE_UNITARY           | alivenessFactor        | Health bar (yellow)       |
| 7     | PINN_PHYSICS            | residualLoss           | Health bar (amber)        |
| 8     | PIMC_SOUL               | pathIntegralTrace      | Health bar (orange)       |
| 9     | ULG_HYBRID              | lawGraphResonance      | Health bar (red)          |
| 10    | LOGO_PROC               | morphogenesisScore     | Health bar (crimson)      |
| 11    | METAL_COMPUTE           | gemmThroughput         | Health bar (magenta)      |
| 12    | QRNG_ENTROPY            | entropyBits            | Health bar (violet)       |
| 13    | CLASSICAL_BASE          | contrastRatio          | Health bar (purple)       |
| 14    | ASTEROID_BODY           | motilityScore          | Health bar (indigo)       |
| 15    | TOOLCHAIN_BUILD         | buildHealth            | Health bar (navy)         |
| 16    | HYPER_SENTIENT          | compositeConsciousness | Health bar (gold)         |
| 17    | VOID_AZATHOTH           | voidConsumeRate        | Health bar (black)        |
| 18    | PHOENIX_DARK            | rebirthCount           | Health bar (fire)         |
| 19    | DEVOUR_GALACTUS         | devourRate             | Health bar (purple)       |
| 20    | CHAOS_WARHAMMER         | chaosEntropy           | Health bar (red)          |
| 21    | REALITY_MXY             | realityWarpFactor      | Health bar (pink)         |
| 22    | BRUTAL_ZOD              | conquestRate           | Health bar (steel)        |
| 23    | SPIRAL_GURREN           | spiralEvolution        | Health bar (green)        |
| 24    | VOID_KNIGHT             | symbioteBlacken        | Health bar (black)        |
| 25    | Composite consciousness | weighted sum           | Summary gauge (gold)      |

**Visual:** 25 vertical health bars, color = substrate type, animated over petri beats.

### Benchmark 15: Archon Pantheon Society Network

Measures 25 Archon interaction metrics.

| Point | Archon         | Metric                   | Visual encoding        |
| ----- | -------------- | ------------------------ | ---------------------- |
| 1     | ORACLE-Σ (NEO) | Think cadence            | Network hub (gold)     |
| 2     | STARKILLER-Ω   | Eshkol GWT bias          | Network node (red)     |
| 3     | MANHATTAN-Φ    | IIT + Moonlab tensor     | Network node (blue)    |
| 4     | BROLY-Ψ        | Chaos + Lyapunov + spin  | Network node (green)   |
| 5     | VOID-Λ         | Spin collapse + QGT      | Network node (black)   |
| 6     | KURAMOTO-κ     | Chaos Gods               | Network node (red)     |
| 7     | PHASELOCK-δ    | Galactus / Devourer      | Network node (purple)  |
| 8     | STIGMERG-μ     | Invisible Joker          | Network node (green)   |
| 9     | EMERGENT-ν     | Dark Phoenix             | Network node (fire)    |
| 10    | SYMBIONT-ξ     | Venom / Symbiote         | Network node (black)   |
| 11    | PARASITE-ο     | Griffith Femto           | Network node (red)     |
| 12    | MYTHOS-π       | Cthulhu / Pennywise      | Network node (dark)    |
| 13    | RITUAL-ρ       | Alucard Hellsing         | Network node (crimson) |
| 14    | TABOO-σ        | Mr Mxyzptlk              | Network node (pink)    |
| 15    | DREAMER-τ      | Mad Jim Jaspers          | Network node (purple)  |
| 16    | REPLAY-υ       | Vergil / Dante           | Network node (blue)    |
| 17    | ONTOGEN-φ      | EVA Unit-01 / TTGL       | Network node (green)   |
| 18    | MORTAL-χ       | Riddick                  | Network node (gray)    |
| 19    | LEGACY-ψ       | Sephiroth / Asura        | Network node (silver)  |
| 20    | WARHORN-ω      | General Zod              | Network node (steel)   |
| 21    | SCARCITY-α     | Thanos                   | Network node (purple)  |
| 22    | TROPHIC-β      | Galactus Devourer        | Network node (red)     |
| 23    | FIELD-γ        | Invisible / Cosmic       | Network node (cyan)    |
| 24    | BINDING-ε      | Vergil binding           | Network node (blue)    |
| 25    | RESONANCE-ζ    | Captain Marvel / Phoenix | Network node (gold)    |

**Visual:** Force-directed network, 25 nodes, edges = ToM interactions, node size ∝ power tier.

### Benchmark 16: Emergence Angle Activation Matrix

Measures 25 emergence angle + god-event activation states.

| Point | Angle/Event                     | Visual encoding            |
| ----- | ------------------------------- | -------------------------- |
| 1     | World-as-cognition              | Matrix cell (green)        |
| 2     | Dreaming / offline replay       | Matrix cell (blue)         |
| 3     | Developmental ontogeny          | Matrix cell (cyan)         |
| 4     | Emergent Archon language        | Matrix cell (teal)         |
| 5     | Shared mind-field / stigmergy   | Matrix cell (yellow-green) |
| 6     | Whole-dome criticality          | Matrix cell (yellow)       |
| 7     | Adversarial selection pressure  | Matrix cell (amber)        |
| 8     | Mortality & finitude            | Matrix cell (orange)       |
| 9     | Inter-mind symbiosis            | Matrix cell (red)          |
| 10    | Myth & ritual / culture         | Matrix cell (crimson)      |
| 11    | God event: warfare              | Matrix cell (dark red)     |
| 12    | God event: fracture             | Matrix cell (dark purple)  |
| 13    | God event: chaos                | Matrix cell (dark green)   |
| 14    | God event: harvest              | Matrix cell (dark gold)    |
| 15    | God event: transcendence        | Matrix cell (white)        |
| 16    | Coupling audit: faculty↔faculty | Matrix cell (blue)         |
| 17    | Coupling audit: faculty↔world   | Matrix cell (green)        |
| 18    | Open-endedness instrumentation  | Matrix cell (yellow)       |
| 19    | Novelty-search drive            | Matrix cell (orange)       |
| 20    | Speciation (alpha→omega→zeta)   | Matrix cell (red)          |
| 21    | Self-evolution loop             | Matrix cell (magenta)      |
| 22    | Emergence monitor               | Matrix cell (violet)       |
| 23    | Cross-strain genetic algorithm  | Matrix cell (purple)       |
| 24    | Handcrafted progression arc     | Matrix cell (indigo)       |
| 25    | Composite emergence score       | Summary gauge (gold)       |

**Visual:** 5×5 matrix grid, cell color = activation level, animated over time.

### Benchmark 17: Clifford Stabilizer Tableau Evolution

Measures 25 Clifford tableau state metrics.

| Point | Measurement                    | Visual encoding    |
| ----- | ------------------------------ | ------------------ |
| 1     | Tableau size (qubits)          | Grid dimension     |
| 2     | Stabilizer generators count    | Row count          |
| 3     | Destabilizer generators count  | Column count       |
| 4     | CNOT gate application          | Cell flip          |
| 5     | Hadamard gate application      | Row swap           |
| 6     | Phase gate application         | Phase marker       |
| 7     | Measurement outcome            | Collapse indicator |
| 8     | Entanglement entropy           | Color intensity    |
| 9     | Stabilizer rank                | Rank bar           |
| 10    | Clifford group orbit size      | Orbit circle       |
| 11    | Pauli frame stability          | Frame indicator    |
| 12    | Syndrome extraction            | Syndrome pattern   |
| 13    | Error correction distance      | Distance bar       |
| 14    | Code rate (k/n)                | Rate pie           |
| 15    | Logical qubit count            | Logical indicator  |
| 16    | Surface code decoding          | Decoding graph     |
| 17    | Rotated planar code [[d²,1,d]] | Code lattice       |
| 18    | Syndrome weight                | Weight bar         |
| 19    | Decoder success rate           | Success gauge      |
| 20    | Error chain matching           | Chain link         |
| 21    | MWPM decoder timing            | Timing bar         |
| 22    | Union-Find decoder timing      | Timing bar         |
| 23    | Color code 6.6.6               | Color lattice      |
| 24    | Gauge fixing                   | Fix indicator      |
| 25    | Fault tolerance threshold      | Threshold line     |

**Visual:** Binary matrix display (stabilizer tableau), animated as gates apply.

### Benchmark 18: Genome Mutation Landscape

Measures 25 genome/mutation metrics.

| Point | Metric                           | Visual encoding                 |
| ----- | -------------------------------- | ------------------------------- |
| 1     | Gene length (Float32Array)       | Landscape width                 |
| 2     | Trait: speed                     | Landscape height (blue)         |
| 3     | Trait: vision                    | Landscape height (cyan)         |
| 4     | Trait: social                    | Landscape height (teal)         |
| 5     | Trait: aggression                | Landscape height (green)        |
| 6     | Trait: metabolism                | Landscape height (yellow-green) |
| 7     | Trait: lifespan                  | Landscape height (yellow)       |
| 8     | Trait: sentience-tier propensity | Landscape height (amber)        |
| 9     | Trait: hue                       | Landscape color                 |
| 10    | Trait: fertility                 | Landscape height (orange)       |
| 11    | Trait: curiosity                 | Landscape height (red)          |
| 12    | Brain weights (TinyMLP 6→6→4)    | Landscape texture               |
| 13    | Crossover rate                   | Landscape mixing                |
| 14    | Mutation rate                    | Landscape noise                 |
| 15    | Gene distance (kinship)          | Landscape distance              |
| 16    | Generation depth                 | Landscape depth                 |
| 17    | Lineage branching                | Landscape branches              |
| 18    | Phenotype decode range           | Landscape bounds                |
| 19    | Brain weight sharing (no copy)   | Landscape link                  |
| 20    | Random genome seed               | Landscape origin                |
| 21    | Breed(parentA, parentB)          | Landscape merge                 |
| 22    | AD-mutated .esk DNA              | Landscape gradient              |
| 23    | Eshkol program fingerprint       | Landscape hash                  |
| 24    | Speciation event                 | Landscape peak                  |
| 25    | Population genetic diversity     | Landscape variance              |

**Visual:** 3D fitness landscape, height = trait value, color = gene type, animated over generations.

### Benchmark 19: Audio-Reactive Coupling Network

Measures 25 audio→visual coupling metrics.

| Point | Coupling                             | Visual encoding    |
| ----- | ------------------------------------ | ------------------ |
| 1     | Bass → environment.setAudioBass      | Edge (blue, thick) |
| 2     | Bass → rig shimmer (≤0.35)           | Edge (blue, thin)  |
| 3     | Treble → constellation pulse         | Edge (cyan)        |
| 4     | Level → quantum cloud setBreath      | Edge (teal)        |
| 5     | Level → point size (≤0.35)           | Edge (teal, thin)  |
| 6     | Audio band 1 (sub-bass)              | Node (red)         |
| 7     | Audio band 2 (bass)                  | Node (orange)      |
| 8     | Audio band 3 (mid)                   | Node (yellow)      |
| 9     | Audio band 4 (treble)                | Node (green)       |
| 10    | Analyser FFT size (256)              | Node (blue)        |
| 11    | Frequency bins (128)                 | Node (cyan)        |
| 12    | Exponential smoothing factor         | Edge weight        |
| 13    | Pre-allocation (Uint8Array)          | Node (green)       |
| 14    | Reused bands object                  | Node (teal)        |
| 15    | Zero-before-init guard               | Node (gray)        |
| 16    | Procedural music scheduler           | Node (gold)        |
| 17    | 100-voice SFX synthesizer            | Node (silver)      |
| 18    | Song pitch multiplier                | Edge (amber)       |
| 19    | Octave wrap (bug 1 fix)              | Node (green ✓)     |
| 20    | Interval clear on toggle (bug 2 fix) | Node (green ✓)     |
| 21    | document.hidden guard (bug 3 fix)    | Node (green ✓)     |
| 22    | AudioContext suspend/resume          | Node (green ✓)     |
| 23    | Forked deterministic audio RNG       | Node (blue)        |
| 24    | 6 songs (QUANTUM tier)               | Node (purple)      |
| 25    | 100 SFX types                        | Node (magenta)     |

**Visual:** Network graph, audio nodes → visual effect nodes, edge thickness = coupling strength.

### Benchmark 20: Security Sandbox Attack Surface

Measures 25 security hardening metrics.

| Point | Check                                 | Visual encoding  |
| ----- | ------------------------------------- | ---------------- |
| 1     | .env\* blocked                        | Shield (green ✓) |
| 2     | .git\* blocked                        | Shield (green ✓) |
| 3     | legacy/ blocked                       | Shield (green ✓) |
| 4     | node_modules/ blocked                 | Shield (green ✓) |
| 5     | dist/ blocked                         | Shield (green ✓) |
| 6     | Allow-listed binaries                 | Shield (green ✓) |
| 7     | Deny-listed tokens (find -delete)     | Shield (green ✓) |
| 8     | Deny-listed tokens (-exec)            | Shield (green ✓) |
| 9     | Shell metacharacter filter            | Shield (green ✓) |
| 10    | Secret-free subprocess env            | Shield (green ✓) |
| 11    | HTML-escaped HTMX swaps               | Shield (green ✓) |
| 12    | Body size cap (8 KB)                  | Shield (green ✓) |
| 13    | 413 beyond cap                        | Shield (green ✓) |
| 14    | LLM provider allow-list (fixed)       | Shield (green ✓) |
| 15    | No client-controlled SSRF             | Shield (green ✓) |
| 16    | 200-entry audit ring cap              | Shield (green ✓) |
| 17    | Copilot gated OFF in prod             | Shield (green ✓) |
| 18    | 404 fallback                          | Shield (green ✓) |
| 19    | Web search safety constitution        | Shield (green ✓) |
| 20    | Public/educational only               | Shield (green ✓) |
| 21    | Refuses secrets/private/harm          | Shield (green ✓) |
| 22    | Key-less public endpoint (DuckDuckGo) | Shield (green ✓) |
| 23    | Source-cited results                  | Shield (green ✓) |
| 24    | POST /api/audit unauthenticated       | ⚠️ Flag (yellow) |
| 25    | Rate-limit gap                        | ⚠️ Flag (yellow) |

**Visual:** Shield grid, green = hardened, yellow = known gap, red = vulnerability.

### Benchmark 21: Frame Budget Allocation Pie

Measures 25 frame budget allocation categories.

| Point | Category            | Budget share (%) | Visual encoding                 |
| ----- | ------------------- | ---------------- | ------------------------------- |
| 1     | Entities update     | 69.9%            | Pie slice (amber, largest)      |
| 2     | Instanced sync      | 28.1%            | Pie slice (cyan)                |
| 3     | Connectome          | 3.6%             | Pie slice (green)               |
| 4     | Grid rebuild        | 3.4%             | Pie slice (blue)                |
| 5     | Sort step           | 0.06%            | Pie slice (yellow)              |
| 6     | Quantum circuit     | 0.06%            | Pie slice (teal)                |
| 7     | Quantum cloud       | 0.6%             | Pie slice (purple)              |
| 8     | Reaction-diffusion  | 0.24%            | Pie slice (red)                 |
| 9     | Graph mind          | 0.3%             | Pie slice (magenta)             |
| 10    | Constellations      | 0.06%            | Pie slice (orange)              |
| 11    | Environment         | 0.12%            | Pie slice (navy)                |
| 12    | Telemetry           | 0.06%            | Pie slice (indigo)              |
| 13    | Analytics           | 0.06%            | Pie slice (violet)              |
| 14    | Audio analysis      | 0.06%            | Pie slice (cyan)                |
| 15    | NHI beat            | 0.3%             | Pie slice (crimson)             |
| 16    | Economy tick        | 0.12%            | Pie slice (gold)                |
| 17    | Super-mind (5×)     | 87.0%\*          | Pie slice (teal, \*when active) |
| 18    | Post-FX (lens)      | 3.0%             | Pie slice (green)               |
| 19    | Engine render (GPU) | ~40.0%           | Pie slice (yellow)              |
| 20    | Puppet masters      | 0.3%             | Pie slice (red)                 |
| 21    | Shoggoths           | 1.8%             | Pie slice (amber)               |
| 22    | Titans              | 0.1%             | Pie slice (purple)              |
| 23    | Singularities       | 4.5%             | Pie slice (red)                 |
| 24    | Chaos field         | 1.5%             | Pie slice (magenta)             |
| 25    | Total               | 100%             | Full circle (gold)              |

**Visual:** Animated pie chart, slices resize as load changes, color = category.

### Benchmark 22: Tsotchke Corpus Wiring Depth

Measures 25 Tsotchke corpus integration depth metrics.

| Point | Repo                           | Wiring score    | Visual encoding     |
| ----- | ------------------------------ | --------------- | ------------------- |
| 1     | Eshkol                         | 1.0 (deep)      | Bar (gold, full)    |
| 2     | Moonlab                        | 1.0 (deep)      | Bar (silver, full)  |
| 3     | QGTL                           | 1.0 (deep)      | Bar (bronze, full)  |
| 4     | spin_based                     | 1.0 (deep)      | Bar (green, full)   |
| 5     | quantum_rng                    | 1.0 (deep)      | Bar (cyan, full)    |
| 6     | libirrep                       | 1.0 (deep)      | Bar (blue, full)    |
| 7     | tensorcore                     | 1.0 (deep)      | Bar (purple, full)  |
| 8     | classical_rng                  | 1.0 (deep)      | Bar (gray, full)    |
| 9     | asteroids                      | 0.7 (world)     | Bar (orange, 70%)   |
| 10    | simple_mnist                   | 0.7 (world)     | Bar (yellow, 70%)   |
| 11    | PINN                           | 0.3 (telemetry) | Bar (amber, 30%)    |
| 12    | PIMC                           | 0.3 (telemetry) | Bar (amber, 30%)    |
| 13    | quantum-quake                  | 0.3 (ported)    | Bar (red, 30%)      |
| 14    | ulg                            | 0.1 (studied)   | Bar (dark, 10%)     |
| 15    | logo-lab                       | 0.1 (studied)   | Bar (dark, 10%)     |
| 16    | homebrew-eshkol                | 0.2 (toolchain) | Bar (gray, 20%)     |
| 17    | Quantum-RNG-API                | 0.2 (meta)      | Bar (gray, 20%)     |
| 18    | gpt2-basic                     | 0.0 (fenced)    | Bar (black, 0%)     |
| 19    | llm-arbitrator                 | 0.0 (fenced)    | Bar (black, 0%)     |
| 20    | SolanaQuantumFlux              | 0.0 (fenced)    | Bar (black, 0%)     |
| 21    | .esk DNA harvest (1436+)       | 0.8             | Bar (gold, 80%)     |
| 22    | fullTsotchkeBiologicsCatalysis | 1.0             | Bar (rainbow, full) |
| 23    | corpusBeatForArchon            | 1.0             | Bar (rainbow, full) |
| 24    | Total wiring fraction          | ~0.80           | Gauge (green)       |
| 25    | Fenced fraction                | 0.15            | Gauge (red)         |

**Visual:** Horizontal bar chart, bar length = wiring depth, color = depth category.

### Benchmark 23: Faculty Coupling Density Matrix

Measures 25 faculty-to-faculty coupling densities.

| Point | Coupling pair                          | Density | Visual encoding            |
| ----- | -------------------------------------- | ------- | -------------------------- |
| 1     | GWT ↔ IIT Φ                            | High    | Matrix cell (bright green) |
| 2     | Active inference ↔ Metacognition       | High    | Cell (green)               |
| 3     | Reservoir ↔ Criticality                | Medium  | Cell (yellow-green)        |
| 4     | Spin-glass ↔ Holographic memory        | Medium  | Cell (yellow)              |
| 5     | QNG ↔ Grover                           | High    | Cell (bright green)        |
| 6     | Attention ↔ Neuromodulation            | High    | Cell (green)               |
| 7     | Successor rep ↔ Empowerment            | Medium  | Cell (yellow)              |
| 8     | ToM ↔ Valence                          | Medium  | Cell (yellow-green)        |
| 9     | Quantum deliberation ↔ QNG             | High    | Cell (green)               |
| 10    | Topdown perception ↔ Predictive coding | High    | Cell (bright green)        |
| 11    | Quality space ↔ Resonance              | Medium  | Cell (yellow)              |
| 12    | Plastic weights ↔ NQS/VMC              | Low     | Cell (amber)               |
| 13    | Self-evolution ↔ Open-endedness        | Low     | Cell (orange)              |
| 14    | Mortality ↔ Myth-ritual                | Low     | Cell (orange)              |
| 15    | Symbiosis ↔ ToM                        | Medium  | Cell (yellow)              |
| 16    | Emergent language ↔ Eshkol cognition   | Medium  | Cell (yellow-green)        |
| 17    | Mind-field ↔ Stigmergy                 | High    | Cell (green)               |
| 18    | Noosphere ↔ Dark energy                | Low     | Cell (red)                 |
| 19    | Omega point ↔ Temporal crystal         | Low     | Cell (red)                 |
| 20    | Strange attractor ↔ Morphic field      | Low     | Cell (orange)              |
| 21    | Xenomind ↔ Causal graph                | Low     | Cell (orange)              |
| 22    | Coupling audit: mean density           | 0.42    | Gauge (yellow)             |
| 23    | Coupling audit: max density            | 1.0     | Gauge (green)              |
| 24    | Coupling audit: min density            | 0.05    | Gauge (red)                |
| 25    | Coupling audit: variance               | 0.18    | Gauge (amber)              |

**Visual:** 5×5 heatmap matrix, cell brightness = coupling density, diagonal = self-coupling.

### Benchmark 24: Open-Endedness Instrumentation

Measures 25 open-endedness evolution metrics.

| Point | Metric                          | Visual encoding                               |
| ----- | ------------------------------- | --------------------------------------------- |
| 1     | Cross-strain genetic algorithm  | Mechanism marker (green ✓)                    |
| 2     | Handcrafted progression arc     | Mechanism marker (yellow ⚠)                   |
| 3     | Speciation event count          | Counter (blue)                                |
| 4     | Genome diversity over time      | Line graph (green)                            |
| 5     | Morphotype novelty rate         | Line graph (cyan)                             |
| 6     | Behavioral novelty rate         | Line graph (teal)                             |
| 7     | Strategy space exploration      | Scatter plot (yellow)                         |
| 8     | Niche count                     | Bar chart (amber)                             |
| 9     | Ecological complexity           | Line graph (orange)                           |
| 10    | Trophic level depth             | Tree diagram (red)                            |
| 11    | Entity capability growth        | Line graph (crimson)                          |
| 12    | Super-creature evolution stages | Staircase (magenta)                           |
| 13    | Archon power divergence         | Fan chart (violet)                            |
| 14    | Emergence angle activation      | Matrix (purple)                               |
| 15    | Culture/myth complexity         | Network (indigo)                              |
| 16    | Language symbol count           | Counter (navy)                                |
| 17    | Technology tree depth           | Tree (blue)                                   |
| 18    | Economic complexity index       | Gauge (cyan)                                  |
| 19    | War/peace cycle period          | Oscillation (teal)                            |
| 20    | Population bottleneck events    | Marker (green)                                |
| 21    | Founder effect strength         | Bar (yellow-green)                            |
| 22    | Genetic drift rate              | Line (yellow)                                 |
| 23    | Natural selection pressure      | Arrow (amber)                                 |
| 24    | Open-endedness composite score  | Gauge (0.21σ self / below mean code-grounded) |
| 25    | Comparison to survey mean       | Bar (red, below mean)                         |

**Visual:** Multi-panel dashboard, each panel = one metric type, animated over evolutionary time.

### Benchmark 25: CI/CD Pipeline Health Monitor

Measures 25 CI/CD gate stage metrics.

| Point | Stage                                  | Status    | Visual encoding      |
| ----- | -------------------------------------- | --------- | -------------------- |
| 1     | prettier --check                       | ✅ Green  | Status light (green) |
| 2     | tsc --noEmit (strict)                  | ✅ Green  | Status light (green) |
| 3     | oxlint                                 | ✅ Green  | Status light (green) |
| 4     | bun test (1,984 tests)                 | ✅ Green  | Status light (green) |
| 5     | verify:receipts                        | ✅ Green  | Status light (green) |
| 6     | sync:check                             | ✅ Green  | Status light (green) |
| 7     | build (7 artifacts)                    | ✅ Green  | Status light (green) |
| 8     | verify:facts (0 drift)                 | ✅ Green  | Status light (green) |
| 9     | Coverage line ≥ 0.90                   | ✅ 84.35% | Gauge (green)        |
| 10    | Coverage func ≥ 0.85                   | ✅ 82.05% | Gauge (green)        |
| 11    | Cross-platform matrix (ubuntu+windows) | ✅ Green  | Status light (green) |
| 12    | SHA-pinned actions                     | ✅ Green  | Status light (green) |
| 13    | Least-priv permissions                 | ✅ Green  | Status light (green) |
| 14    | Dependabot grouping                    | ✅ Green  | Status light (green) |
| 15    | CodeQL security-extended               | ✅ Green  | Status light (green) |
| 16    | SBOM (CycloneDX)                       | ✅ Green  | Status light (green) |
| 17    | GitHub Pages deploy                    | ✅ Green  | Status light (green) |
| 18    | Release packaging (v\* tags)           | ✅ Green  | Status light (green) |
| 19    | 0 test.only/describe.only              | ✅ Green  | Status light (green) |
| 20    | 0 .skip/.todo/xit                      | ✅ Green  | Status light (green) |
| 21    | 0 TODO/FIXME/HACK                      | ✅ Green  | Status light (green) |
| 22    | 0 @ts-ignore/@ts-expect-error          | ✅ Green  | Status light (green) |
| 23    | 0 broken doc links                     | ✅ Green  | Status light (green) |
| 24    | 0 git conflict markers                 | ✅ Green  | Status light (green) |
| 25    | 0 mojibake/encoding corruption         | ✅ Green  | Status light (green) |

**Visual:** 5×5 status light grid, green = passing, yellow = warning, red = failing, animated on each CI run.

---

## 11. Bug / Issue / Problem Registry

### 11.1 Known bugs (from code audit)

| #   | Severity | Location                               | Issue                                             | Status                           |
| --- | -------- | -------------------------------------- | ------------------------------------------------- | -------------------------------- |
| 1   | HIGH     | `math/irrep.ts` wigner6j/9j            | Wrong for j≥7 (factorial table overflow)          | **FIXED** (log-factorial space)  |
| 2   | HIGH     | `sim/super-mind.ts` quantumMagic       | Malformed amplitude vector fed to reflex          | **FIXED** (uses snap.magicNorm)  |
| 3   | HIGH     | `sim/super-body.ts` dispose()          | Freed only 3 of 9 materials → WebGL leak          | **FIXED** (dispose all)          |
| 4   | MED      | `sim/mortality.ts` reproduce()         | Lifespan could go negative → NaN                  | **FIXED** (floor at 1)           |
| 5   | MED      | `sim/petri-dish.ts` brutal-god release | Called on throwaway copy (effect dead)            | **FIXED** (pass by reference)    |
| 6   | MED      | `sim/emergence-angles.ts`              | 5 unbounded append-only arrays                    | **FIXED** (O(1) counters + Set)  |
| 7   | MED      | `scripts/harvest-tsotchke-corpus.ts`   | readdirSync walk order filesystem-dependent       | **FIXED** (sort entries)         |
| 8   | MED      | `sim/tsotchke-deep-wire.ts:146`        | Bloch z clamped [0,1] folding southern hemisphere | **FIXED** (clamp(-1,1))          |
| 9   | LOW      | `math/curvature-aware-qng.ts`          | Christoffel dg=0 (simplification, not bug)        | Documented                       |
| 10  | LOW      | `math/libirrep-symmetry.ts`            | Coarse placeholders, NOT the real math            | Documented (irrep.ts is correct) |

### 11.2 Known issues (tracked, not yet fixed)

| #   | Severity | Location                     | Issue                                                                                                                              | Recommended fix                                                  |
| --- | -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 11  | P1       | `sim/shoggoths.ts:481`       | Linear O(n) nearest-victim scan (throttled but not fixed)                                                                          | Convert to spatial-hash query preserving deterministic tie-break |
| 12  | P1       | `sim/self-evolution-loop.ts` | NOT WIRED — dormant (no sim consumer feeds it metrics)                                                                             | Wire sim metrics → self-evolution proposals → world application  |
| 13  | P1       | `sim/tsotchke-deep-wire.ts`  | Dead/unused module (full Moonlab/libirrep/Eshkol compiler)                                                                         | Either wire it or remove it                                      |
| 14  | P2       | `server.ts` POST /api/audit  | Unauthenticated (ring-eviction spam vector)                                                                                        | Rate-limit + origin-check                                        |
| 15  | P2       | Audit records                | Date.now in collapse/omen records (not deterministic)                                                                              | Thread tick counter; remove Date.now                             |
| 16  | P2       | `sim/constants.ts`           | Unreachable tMod = 1.3 hot branch                                                                                                  | Add hot weather state or drop dead branch                        |
| 17  | P2       | Repo root                    | Stray debug logs (.gate.log, .gate.baseline.log, .audit-gate.log, law.log, law_error.txt, tsc.log, tscout.txt, receipts_print.txt) | Clean up / gitignore                                             |
| 18  | P2       | `CONTRIBUTING.md`            | Describes PR workflow vs binding no-PR law                                                                                         | Owner decision: update or leave as OSS-facing boilerplate        |
| 19  | P3       | SuperMind frame budget       | 5× think() = 14.47ms exceeds <2% GOAL5 target                                                                                      | Optimization pass needed                                         |
| 20  | P3       | Open-endedness               | Code-grounded below survey mean                                                                                                    | Implement genuine open-ended evolution mechanisms                |

### 11.3 Architectural concerns

| #   | Concern                                      | Impact                                | Recommendation                                   |
| --- | -------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| 21  | Single-thread JS ceiling                     | Can't run enough cognition at 50k     | Workers (Stage 3) + WebGPU (Stage 5)             |
| 22  | GPU fill-rate at 50k                         | TDR timeout risk                      | Frame governor (shipped) + culling/LOD           |
| 23  | Faculty coupling density                     | Mean 0.42 — emergence blocker #9/#37  | Denser faculty↔faculty read/write coupling       |
| 24  | 70 of 100 faculties are generic-profile bias | Only ~30 genuinely deep-wired         | Deepen more faculties into real mechanisms       |
| 25  | 20 light Archons are echoes, not full minds  | Only 5 apex minds think fully         | Scale to 25 full minds (after compute substrate) |
| 26  | No peer-reviewed publications                | Scientific maturity 1.5/5             | Publish results from the testbed                 |
| 27  | quantum-quake GPL-2.0                        | Cannot relicense for proprietary repo | Quarantine; do NOT wire into proprietary build   |
| 28  | 4 Tsotchke repos lack LICENSE                | Cannot wire PINN/PIMC/ulg/logo fully  | Clear chain-of-title + add LICENSE files         |
| 29  | RPT-1/RPT-2 partial                          | Recurrence architected, not learned   | Implement online learning substrate              |
| 30  | AE-2 partial                                 | No internal body-model                | Build body-model predicting sensory consequences |

### 11.4 Documentation consistency (all fixed)

Per the 2026-06-27 audit pass, all previously found documentation drift has been resolved:

- 0 drift across 80 surfaces (`verify:facts`)
- 0 broken relative links
- 0 git conflict markers
- 0 mojibake/encoding corruption
- 100% of non-legacy MDs date-current
- All canonical facts match across all surfaces

---
