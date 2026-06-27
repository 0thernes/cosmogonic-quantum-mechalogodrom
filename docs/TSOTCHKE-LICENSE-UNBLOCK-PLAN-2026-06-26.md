<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Tsotchke License Unblock Plan

**Date:** 2026-06-21  
**Purpose:** Unblock 4 Tsotchke repos for deep integration into Cosmogonic Quantum Mechalogodrom  
**Status:** Draft — requires owner action

---

## Repos Requiring License Clearance

### 1. PINN (Physics-Informed Neural Networks)

**Current State:** Ported telemetry-only (`sim/pinn-residual.ts`)  
**Blocker:** NO LICENSE file → all-rights-reserved by default  
**Chain-of-Title Issue:** README claims MIT but author email is `@concordia.ca` → potential university IP claim

**Unblock Steps:**

1. **Owner Action:** Add MIT LICENSE file to PINN repo
2. **Legal Verification:** Confirm Concordia University has no IP claim on PINN code
3. **Copyright Assignment:** Ensure copyright notice reads "Copyright (c) 2024 tsotchke"
4. **Cosmogonic Action:** Once licensed, promote from telemetry-only to decision-critical (world/petri physics metabolism)

**Value:** Gray–Scott reaction-diffusion residuals as field metabolism for digital biologics

---

### 2. PIMC (Path-Integral Monte Carlo)

**Current State:** Ported telemetry-only (`sim/pimc-paths.ts`)  
**Blocker:** NO LICENSE file → all-rights-reserved by default  
**Chain-of-Title Issue:** Same Concordia IP concern as PINN

**Unblock Steps:**

1. **Owner Action:** Add MIT LICENSE file to PIMC repo
2. **Legal Verification:** Confirm Concordia University has no IP claim on PIMC code
3. **Copyright Assignment:** Ensure copyright notice reads "Copyright (c) 2024 tsotchke"
4. **Cosmogonic Action:** Once licensed, promote from telemetry-only to decision-critical (quantum-path substrate for "souls")

**Value:** Path-integral Monte Carlo as quantum-path substrate for digital biologics "souls"

---

### 3. ULG (Universal Law Graph)

**Current State:** Studied-only (`sim/ulg-bridge.ts` exists but not used)  
**Blocker:** NO LICENSE file → all-rights-reserved by default  
**Chain-of-Title Issue:** Authored by `ubernaut` (Collin Schroeder) → needs copyright assignment

**Unblock Steps:**

1. **Owner Action:** Add MIT LICENSE file to ULG repo
2. **Copyright Assignment:** Obtain copyright assignment from Collin Schroeder (ubernaut) to tsotchke/0thernes
3. **Dependency Check:** Verify all ULG dependencies are permissive (no copyleft contamination)
4. **Cosmogonic Action:** Once licensed, wire deep into world/sim (law-graph for world-rule closure, content addressing)

**Value:** Universal Law Graph as world-rule closure-table + content addressing for digital biologics

---

### 4. Logo-Lab

**Current State:** Studied-only (`sim/logo-turtle.ts` exists but not used)  
**Blocker:** NO LICENSE file → all-rights-reserved by default  
**Chain-of-Title Issue:** Same ubernaut assignment as ULG

**Unblock Steps:**

1. **Owner Action:** Add MIT LICENSE file to logo-lab repo
2. **Copyright Assignment:** Obtain copyright assignment from Collin Schroeder (ubernaut) to tsotchke/0thernes
3. **Attribution Check:** Add NOTICE credit to three-ascii/Aceroma (inspiration, not vendored)
4. **Cosmogonic Action:** Once licensed, wire deep into world/sim (procedural morphogenesis, turtle-graphics growth)

**Value:** Procedural morphogenesis and turtle-graphics growth for digital biologics body forms

---

## Repos That Cannot Be Unblocked

### Quantum-Quake

**Current State:** Ported telemetry-only (`sim/quantum-quake-physics.ts`, `sim/qge-aliveness.ts`)  
**Blocker:** GPL-2.0 (QuakeSpasm / id Software derivative)  
**Chain-of-Title Issue:** NOT the owner's to relicense; porting into proprietary repo violates GPL

**Action:** DO NOT WIRE. Quarantine `qge/` layer until legal review determines if quantum layer is separable from GPL engine.

**Note:** Even if quantum layer is separable, it may be a derivative work of GPL code. Legal review required.

---

## Repos Fenced by Design (No Unblock Needed)

### gpt2-basic, llm-arbitrator

**Blocker:** Non-LLM mandate (feature, not bug)  
**Action:** STAY FENCED. Wiring LLMs would betray the NHSI thesis.

### SolanaQuantumFlux

**Blocker:** Proprietary license  
**Action:** Fenced until explicit licensing decision from owner.

### Quantum-RNG-API

**Blocker:** Redundant (core quantum_rng ported directly)  
**Action:** No action needed.

---

## License Template (MIT)

```text
MIT License

Copyright (c) 2024 tsotchke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Priority Order

1. **Highest Leverage:** ULG (law-graph for world-rule closure) → transforms world from static to cognitive
2. **Second Priority:** Logo-Lab (procedural morphogenesis) → enables complex body growth
3. **Third Priority:** PINN (field metabolism) → adds physics-informed learning
4. **Fourth Priority:** PIMC (quantum-path substrate) → adds quantum "soul" mechanics

---

## Legal Disclaimer

**This document is NOT legal advice.** Confirm all chain-of-title and licensing decisions with a qualified attorney before integrating any code into a proprietary repository.

---

_Receipt source:_ `docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md` §61-76
