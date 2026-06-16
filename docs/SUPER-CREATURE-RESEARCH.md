# Super Creature 1.1 — Scientific Grounding

The apex creature's "consciousness" is a set of **explicit, measurable, deterministic mechanisms**, not a
claim of sentience. This document is the honest citation trail behind the V89 _consciousness-metrics
layer_ (and the V84–V88 quantum-substrate ports it sits on). Every reference below was retrieved from a
live source and verified for title, venue, year, and identifier; preprints, vendor language, and contested
claims are flagged. **The rule for this project: the docs say _"inspired by / models"_, never _"implements
consciousness"_ or _"is conscious."_**

Compiled 2026-06-16 (research scout pass).

---

## What the code actually implements vs. what the science says

| Real research thread                                                                | What Super Creature 1.1 actually computes                                                                                                                                                                                                                                                     | Honesty caveat                                                                                                                                               |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Global Workspace / GNW** (Baars, Dehaene) — "ignition"                            | `Consciousness.ignition` — a winner-take-all over the 7 plan-coalitions; when the winner crosses an access threshold _and_ dominates the runner-up it "broadcasts", gating memory consolidation (`super-mind.ts`).                                                                            | A toy model of the _signature_ (ignition + broadcast), not the cortical phenomenon. The 2025 Cogitate test pressured the offset-ignition prediction.         |
| **Integrated Information Theory** (Tononi) — Φ                                      | `Consciousness.phi` — the participation/coherence ratio of 8 named module activations (1 ⇒ parts act as one, 1/M ⇒ independent).                                                                                                                                                              | Explicitly a **tractable surrogate**. True Φ is super-exponential _and_ non-unique; we never claim to compute Φ.                                             |
| **Predictive processing / active inference** (Friston)                              | `ActiveInference` (active-inference.ts) — a discrete free-energy core: a Bayesian belief over 8 latent situations minimising variational free energy F, then plan selection by **expected** free energy G (epistemic curiosity + pragmatic goal-seeking). Plus the predictor→`surprise` loop. | A faithful discrete-AIF implementation; the Free Energy Principle is a unifying _theory_, not a settled empirical fact.                                      |
| **Quantum cognition** (Busemeyer, Trueblood)                                        | The 6-qubit register + Eshkol Born-sampled "thought collapse" + the QGT/Fubini–Study readout (V75–V88).                                                                                                                                                                                       | "Quantum" here is an **algebra on amplitudes/probabilities** in a deterministic sim — nothing about quantum neurons.                                         |
| **Higher-Order Theory / metacognition** (Rosenthal; Lau & Rosenthal; Fleming & Daw) | `Metacognition` (metacognition.ts) — a second-order **confidence** in the decision (decision margin + Φ + belief certainty + calm), spent as cognitive control: low confidence ⇒ EXPLORE to resolve uncertainty, high ⇒ commit/exploit.                                                       | A computational confidence/control model — NOT a claim of subjective higher-order awareness.                                                                 |
| **Organoid intelligence / "wet computing"**                                         | `Reservoir` (reservoir.ts) — a 64-node **echo-state network** (the algorithm physical/organoid reservoirs use): a fading nonlinear echo of recent latents giving temporal memory + a novelty signal that sharpens curiosity.                                                                  | We implement the reservoir-computing **algorithm**, NOT wetware — there is no biological substrate. Organoid reservoirs are the real-world inspiration only. |

---

## 1. Scientific theories of consciousness — the IIT vs GNWT adversarial collaboration (Cogitate)

- The flagship result is published and is a genuine **double-bind, not a win for either side**: the
  preregistered adversarial test (n = 256; fMRI + MEG + iEEG) aligned with _some_ predictions of both IIT
  and GNWT while **challenging key tenets of both** — IIT contradicted by a lack of sustained posterior
  synchronization, GNWT by a lack of prefrontal "ignition" at stimulus offset (Ferrante et al., 2025,
  _Nature_).
- The collaboration was **designed up front to falsify**, with both camps co-signing predictions before
  data collection (Melloni et al., 2023, _PLOS ONE_).
- **Adversarial note:** the GNWT proponents dispute the framing, arguing the offset-ignition prediction
  tested was not core to the theory (Naccache, Sergent & Dehaene, 2025, _Neuroscience of Consciousness_).
  Cite the _outcome_, not a verdict.

## 2. Integrated Information (Φ) — tractable proxies and intractability

- True Φ is not just expensive, it is **under-determined**: Hanson & Walker (2023) show Φ in IIT 3.0 is
  _non-unique_ — systems exist for which Φ = 0 and Φ > 0 are simultaneously valid.
- The proxies used in practice (decoder-based Φ\*, geometric Φ_G, stochastic interaction) are openly
  acknowledged approximations to a "computationally intractable" measure (Nilsen, Arena & Storm, 2024).
- A 2024 peer-reviewed alternative sidesteps Φ with a tractable **integration–segregation difference**
  (ISD), classifying conscious states at ~93% accuracy — a _correlate_, not an identity claim (Jang,
  Mashour & Hudetz, 2024, _Nature Communications_). **This is the family our `phi` proxy belongs to.**
- **Caveat:** integrated-information measures sometimes _increase_ under anesthesia, contrary to IIT — they
  are state-discriminators, not validated "amount of consciousness" meters (Nilsen et al., 2024).

## 3. Global Workspace / "ignition"

- Ignition remains the named neural signature of conscious access in the Dehaene line, but the strongest
  2025 test (Cogitate) **failed to find the predicted offset ignition** (Ferrante et al., 2025).
- The GNWT camp's rebuttal reasserts the framework and defends ignition as still viable (Naccache et al.,
  2025).
- Convergence work argues GNWT is compatible with the complexity-based PCI historically tied to the _rival_
  theory (Farisco & Changeux, 2023).

## 4. Organoid intelligence / "wet computing" / biocomputing

- **Brainoware** — a human brain organoid as a physical reservoir for speech-recognition / nonlinear tasks;
  a real, peer-reviewed proof-of-concept with modest accuracy (Cai, Ao, Tian et al., 2023, _Nature
  Electronics_).
- **DishBrain** — in-vitro neurons "learn Pong"; the word _sentience_ is the authors' **operational
  redefinition** (responsiveness), not evidence of consciousness (Kagan et al., 2022, _Neuron_). Underpins
  Cortical Labs' 2025 commercial CL1.
- **FinalSpark Neuroplatform** — 16 organoids / ~160k neurons accessible over the cloud; the "1,000,000×
  less energy" figure is a **vendor projection**, not a measured benchmark (Jordan et al., 2024).
- The **Organoid Intelligence** roadmap is an aspirational position paper, not a result (Smirnova et al.,
  2023, _Frontiers in Science_).

## 5. Active inference / predictive processing & quantum cognition

- The **Free Energy Principle** is mature and widely applied but is a unifying _theory_; whether it adds
  mechanistic content beyond Bayesian inference is debated (Friston, 2010; Piekarski, 2023).
- A 2024 bridge approximates the otherwise-intractable exact free-energy computation with diffusion models —
  an engineering demo, not neuroscience evidence (Durand, Joffily & Khamassi, 2024).
- **Quantum cognition** is a legitimate mathematical-modeling program, **not** a claim the brain is quantum;
  order effects fall out of non-commuting projection operators (Huang, Epping & Trueblood, 2025; Busemeyer &
  Bruza, 2024).

---

## 6. World models & predictive maps — the successor representation

- The **successor representation** (SR) reformulates value as expected discounted future state-occupancy,
  M = Σ γᵗ P(sₜ | s₀) (Dayan, 1993): a predictive cache that supports fast, flexible re-planning when
  rewards shift. The landmark neuroscience claim is that the **hippocampus encodes exactly this predictive
  map** — place/grid fields as discounted future occupancy, not mere present location (Stachenfeld,
  Botvinick & Gershman, 2017, _Nature Neuroscience_); human reinforcement learning shows SR-consistent
  behavioural and neural signatures (Momennejad et al., 2017, _Nature Human Behaviour_).
- **What Super Creature 1.1 computes:** `src/sim/successor-representation.ts` — a deterministic SR matrix
  over the 7 plan-archetypes, learned online by the TD rule M(s,·) ← M(s,·) + α[φ(s) + γM(s′,·) − M(s,·)]
  toward the closed form (I − γT)⁻¹, used each beat as a model-based **look-ahead** that biases plan
  selection toward behaviour whose learned successor-states carry high value.
- **Honesty caveat:** a tabular SR over 7 discrete plan-states — a faithful implementation of the SR
  _algorithm_, not a claim about biological place cells. It is "model-based planning over the creature's own
  behavioural dynamics," not a world model of the external scene.

## 7. Empowerment — information-theoretic agency / intrinsic motivation

- **Empowerment** is a reward-free, agent-centric measure of control: the channel capacity I(Aⁿ; S′ | s)
  between an agent's action sequence and its resulting future state — the maximum information the agent can
  inject into its own future (Klyubin, Polani & Nehaniv, 2005; Salge, Glackin & Polani, 2014). It is a
  distinct intrinsic motivation from novelty/surprise and from the active-inference _epistemic_ term: an
  empowered agent seeks states of high **optionality** (where its choices matter), not merely surprising or
  uncertainty-reducing ones. It remains a live frontier — Tiomkin, Nemenman, Polani & Tishby (2023) give the
  dynamical-systems treatment; Levy, Allievi & Konidaris (2024) estimate empowerment from a _latent_
  predictive model with no simulator (exactly this setting); Lidayan et al. (2025) find entropy/empowerment
  align with human open-world exploration **better than curiosity**.
- **What Super Creature 1.1 computes:** `src/sim/empowerment.ts` — each beat it bins the 16-D world-model
  latent into M = 64 coarse cells by the signs of a frozen random-hyperplane LSH, maintains an online
  exponential-forgetting estimate of the K × M channel q(cell | plan) from its committed-plan → next-cell
  transitions, and runs the **Blahut–Arimoto** algorithm (Blahut, 1972; Arimoto, 1972) for a fixed 12
  iterations to read the channel capacity C in nats; empowerment = C / ln K ∈ [0, 1]. The result feeds a
  curiosity lift toward controllable regions and a bounded vote for the plan whose action-row most steers the
  future. Blahut–Arimoto's iterate provably raises the capacity lower bound monotonically toward the true
  capacity — a closed-form property the module unit-tests, alongside the two known limits (a deterministic,
  fully-controllable channel ⇒ empowerment 1; a degenerate channel ⇒ 0).
- **Honesty caveat:** a discrete, online empowerment estimate over 7 plan-archetypes and 64 LSH cells — a
  faithful implementation of the empowerment _objective_ and the Blahut–Arimoto capacity _algorithm_, not a
  claim of true n-step empowerment over a learned world model. It measures "how much this beat's plan-choice
  shapes the creature's own next coarse state," not control over the external scene.

## Honest framing (cite without overclaiming)

1. **Established / peer-reviewed empirical results:** the Cogitate 2025 _Nature_ adversarial test,
   Brainoware, DishBrain, the FinalSpark Neuroplatform — these happened and are published; describe what was
   _measured_, not what it "proves."
2. **Established theoretical frameworks (not facts):** IIT, GNWT, the Free Energy Principle, quantum-
   probability cognition are coherent, productive _theories_ — none is confirmed as "the" account of mind.
3. **Genuinely contested:** IIT faces a "pseudoscience" open letter (2023, PsyArXiv — itself controversial)
   and a non-uniqueness proof of Φ; treat Φ as mathematically problematic, not a working meter.
4. **Hype-prone terms handled with care:** "sentience" (operational redefinition), "biocomputer" (narrow +
   early), the "1,000,000×" energy figure (vendor projection).
5. **Aspirational, not delivered:** the Organoid Intelligence roadmap and any "conscious organoid" framing.
6. **For this art project this is ideal source material** — real and genuinely unsettled — _provided the
   docs say "inspired by / models" rather than "implements" or "is conscious."_

---

## References

- Arimoto, S. (1972). An algorithm for computing the capacity of arbitrary discrete memoryless channels. _IEEE Transactions on Information Theory, 18_(1), 14–20. https://doi.org/10.1109/TIT.1972.1054753
- Blahut, R. E. (1972). Computation of channel capacity and rate-distortion functions. _IEEE Transactions on Information Theory, 18_(4), 460–473. https://doi.org/10.1109/TIT.1972.1054855
- Busemeyer, J. R., & Bruza, P. D. (2024). _Quantum Models of Cognition and Decision_ (2nd ed.). Cambridge University Press.
- Cai, H., Ao, Z., Tian, C., et al. (2023). Brain organoid reservoir computing for artificial intelligence. _Nature Electronics, 6_, 1032–1039. https://doi.org/10.1038/s41928-023-01069-w
- Dayan, P. (1993). Improving generalization for temporal difference learning: The successor representation. _Neural Computation, 5_(4), 613–624. https://doi.org/10.1162/neco.1993.5.4.613
- Durand, E. D., Joffily, M., & Khamassi, M. (2024). A diffusion model-based approach to active inference. _IEEE FMLDS_, 75–80. https://doi.org/10.1109/fmlds63805.2024.00024
- Farisco, M., & Changeux, J.-P. (2023). About the compatibility between the perturbational complexity index and the global neuronal workspace theory. _Neuroscience of Consciousness, 2023_(1). https://doi.org/10.1093/nc/niad016
- Ferrante, O., Górska, U., Henin, S., et al. (Cogitate Consortium). (2025). Adversarial testing of global neuronal workspace and integrated information theories of consciousness. _Nature, 642_(8066), 133–142. https://doi.org/10.1038/s41586-025-08888-1
- Friston, K. (2010). The free-energy principle: a unified brain theory? _Nature Reviews Neuroscience, 11_, 127–138. https://doi.org/10.1038/nrn2787
- Hanson, J. R., & Walker, S. I. (2023). On the non-uniqueness problem in integrated information theory. _Neuroscience of Consciousness, 2023_(1). https://doi.org/10.1093/nc/niad014
- Huang, J.-Q., Epping, G. P., & Trueblood, J. S. (2025). An overview of the quantum cognition research program. _Psychonomic Bulletin & Review, 32_(6), 2507–2556. https://doi.org/10.3758/s13423-025-02675-9
- Jang, H., Mashour, G. A., & Hudetz, A. G. (2024). Measuring the dynamic balance of integration and segregation underlying consciousness, anesthesia, and sleep. _Nature Communications, 15_(1). https://doi.org/10.1038/s41467-024-53299-x
- Jordan, F. D., et al. (2024). Open and remotely accessible Neuroplatform for research in wetware computing. _Frontiers in Artificial Intelligence, 7_, 1376042. https://doi.org/10.3389/frai.2024.1376042
- Kagan, B. J., et al. (2022). In vitro neurons learn and exhibit sentience when embodied in a simulated game-world. _Neuron, 110_(23). https://doi.org/10.1016/j.neuron.2022.09.001
- Klyubin, A. S., Polani, D., & Nehaniv, C. L. (2005). All else being equal be empowered. In _Advances in Artificial Life (ECAL 2005)_, LNCS 3630, 744–753. https://doi.org/10.1007/11553090_75
- Levy, A., Allievi, A., & Konidaris, G. (2024). Latent-predictive empowerment: Measuring empowerment without a simulator. _arXiv:2410.11155._ https://arxiv.org/abs/2410.11155
- Lidayan, A., Du, Y., Kosoy, E., Rufova, M., Abbeel, P., & Gopnik, A. (2025). Intrinsically-motivated humans and agents in open-world exploration. _arXiv:2503.23631._ https://arxiv.org/abs/2503.23631
- Melloni, L., Mudrik, L., Pitts, M., et al. (2023). An adversarial collaboration protocol for testing contrasting predictions of GNW and IIT. _PLOS ONE, 18_. https://doi.org/10.1371/journal.pone.0268577
- Momennejad, I., Russek, E. M., Cheong, J. H., Botvinick, M. M., Daw, N. D., & Gershman, S. J. (2017). The successor representation in human reinforcement learning. _Nature Human Behaviour, 1_(9), 680–692. https://doi.org/10.1038/s41562-017-0180-8
- Naccache, L., Sergent, C., & Dehaene, S. (2025). GNW theoretical framework and the adversarial testing of GNW and IIT. _Neuroscience of Consciousness, 2025_. https://doi.org/10.1093/nc/niaf037
- Nilsen, A. S., Arena, A., & Storm, J. F. (2024). Exploring effects of anesthesia on complexity, differentiation, and integrated information in rat EEG. _Neuroscience of Consciousness, 2024_(1). https://doi.org/10.1093/nc/niae021
- Piekarski, M. (2023). Incorporating (variational) free energy models into mechanisms. _Synthese, 202_(2). https://doi.org/10.1007/s11229-023-04292-2
- Salge, C., Glackin, C., & Polani, D. (2014). Empowerment — An introduction. In M. Prokopenko (Ed.), _Guided Self-Organization: Inception_ (pp. 67–114). Springer. https://doi.org/10.1007/978-3-642-53734-9_4
- Smirnova, L., Caffo, B., Gracias, D. H., et al. (2023). Organoid intelligence (OI): the new frontier in biocomputing and intelligence-in-a-dish. _Frontiers in Science, 1_, 1017235. https://doi.org/10.3389/fsci.2023.1017235
- Stachenfeld, K. L., Botvinick, M. M., & Gershman, S. J. (2017). The hippocampus as a predictive map. _Nature Neuroscience, 20_(11), 1643–1653. https://doi.org/10.1038/nn.4650
- Tiomkin, S., Nemenman, I., Polani, D., & Tishby, N. (2023). Intrinsic motivation in dynamical control systems. _arXiv:2301.00005._ https://arxiv.org/abs/2301.00005

_Supporting / lower-confidence (verified to exist; secondary): the IIT "pseudoscience" open letter (124
signatories, Sept 2023, PsyArXiv — a contested preprint); the Ferrante et al. (2023) Cogitate bioRxiv
preprint (10.1101/2023.06.23.546249); Cortical Labs CL1 (2025) — a product announcement, not a paper. The
Busemeyer & Bruza 2nd-edition and the FinalSpark DOI were confirmed via publisher/NCBI listings rather than
a direct index hit._
