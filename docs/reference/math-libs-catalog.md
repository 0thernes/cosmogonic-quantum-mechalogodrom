# JavaScript / TypeScript Libraries for Advanced Math, Quantum, Statistics, Physics & Scientific Computing

A comprehensive technical reference for senior engineers. Covers quantum simulation, symbolic algebra, numerical methods, GPU compute, WebAssembly physics, signal processing, cryptographic math, and more. Package names are given as inline `code`; npm install targets are in bold where they differ from common usage.

---

## 1. Quantum Circuit Simulation

### Q.js — `quantum-javascript`

Browser-native quantum circuit simulator written in pure JavaScript. Represents qubits as complex-valued probability amplitude vectors; exposes all standard single- and multi-qubit gates: Hadamard (H), Pauli-X/Y/Z, CNOT, Toffoli (controlled-controlled-NOT), SWAP, phase-shift (R, S, T). Circuits are composed via method chaining and rendered to HTML/CSS circuit diagrams directly in the DOM without any external rendering dependency. Amplitude readout returns probability arrays indexed by computational basis state. Particularly well-suited for educational tooling, browser-based interactives, and rapid prototyping without a backend.

**Key use cases:** Quantum algorithm visualization (Grover, Deutsch-Jozsa), teaching gate-based quantum computing, statevector inspection.

### quantum-circuit — `quantum-circuit`

Production-grade statevector simulator supporting 50+ named gates including parametric rotation gates (Rx, Ry, Rz), controlled-U, and multi-qubit permutations. Maintains a full 2^n complex amplitude statevector with configurable qubit count. Provides export to **OpenQASM**, **Quil** (Rigetti), **Qiskit (Python)**, and **Cirq (Python)** formats; includes an IBM Quantum Experience bridge for submitting circuits to real hardware via the IBM Q REST API. Measurement operators collapse the wavefunction probabilistically; repeated sampling approximates the Born rule distribution.

**Key algorithms covered:** Quantum Fourier Transform (QFT), phase estimation, amplitude amplification.

### Quirk — (no npm; browser-only)

Open-source drag-and-drop quantum circuit simulator running entirely in-browser. Renders Bloch sphere state representations per qubit in real time as gates are added. Visualizes probability amplitudes, density matrices, and interference patterns live. Supports conditional displays, mid-circuit measurements, and custom gate definitions. No build step required — single HTML file deployment. Not suitable for programmatic circuit generation, but invaluable for interactive exploration of entanglement, superposition, and quantum interference.

### Qiskit.js — (archived/historical)

IBM's official JS port of Qiskit, now archived and superseded by the Python Qiskit SDK plus `quantum-circuit`'s IBM Q bridge. Briefly: it exposed an OpenQASM parser, circuit runner, and result parser in Node.js. Not recommended for new projects; noted here for historical context.

---

## 2. Computer Algebra Systems (CAS) / Symbolic Math

### Algebrite — `algebrite`

TypeScript-first CAS implementing a Lisp-style symbolic expression engine. Supports symbolic differentiation (single and partial), multi-variable and definite integration, tensor algebra with Einstein summation, arbitrary-precision rational arithmetic, complex number manipulation in Cartesian and polar forms, symbolic root-finding, unit-aware expressions, and polynomial factoring. The expression tree is immutable; transformations produce new ASTs. Closer to a Mathematica-style CAS than a numeric library.

**Compared to SymPy (Python):** Algebrite covers the majority of undergraduate CAS use cases symbolically but lacks the breadth of special-function simplification and Gröbner basis algorithms present in SymPy. For browser deployment without a Python bridge, Algebrite is the strongest symbolic option.

### Math.js — `mathjs`

The dominant general-purpose math library for JS/TS (~4M weekly npm downloads). Architecture: a pluggable expression parser compiles strings to an AST, which is evaluated against a configurable `MathScope`. Supports:

- **Number types:** `BigNumber` (arbitrary precision via `decimal.js`), `Fraction` (exact rational via `fraction.js`), `Complex`, standard `number`
- **Matrix algebra:** dense and sparse matrix representations, LU decomposition, QR decomposition, eigenvalue decomposition (`eigs`), Cholesky, SVD
- **Symbolic:** differentiation (`derivative()`), expression simplification, symbolic expression trees
- **Units:** dimensional analysis with SI and imperial unit conversion baked in
- **Parser:** full operator precedence, function calls, variable assignment; serializable to JSON AST

**Key use cases:** Engineering calculators, unit-aware computations, symbolic preprocessing before numeric evaluation.

### Nerdamer — `nerdamer`

Symbolic math library focused on algebraic manipulation with LaTeX output. Handles symbolic integration (definite and indefinite), differentiation, system-of-equations solving, polynomial expansion and factoring, and matrix operations over symbolic entries. Output can be rendered directly as LaTeX strings, making it useful for equation editors and math typesetting pipelines. Less capable than Algebrite on tensor operations but stronger on formatted output.

---

## 3. Numerical Analysis & Linear Algebra

### numeric.js — `numeric`

Mature (though minimally maintained) numerical library covering:
- **Matrix decompositions:** LU, Cholesky, QR, SVD, eigenvalue decomposition (for symmetric matrices)
- **Sparse matrix support:** CSR format, sparse LU
- **ODE solvers:** adaptive RK45, implicit solvers
- **Linear system solvers:** `numeric.solve()` via LU factorization

Operates on standard JS arrays; no typed array backend. Performance is adequate for moderate-sized problems (< 1000×1000 matrices) but not competitive with WASM or BLAS-backed alternatives.

### @stdlib/stdlib — `@stdlib/stdlib`

Modular, NumPy-inspired standard library for scientific computing in JS. Individual packages (`@stdlib/math`, `@stdlib/stats`, `@stdlib/blas`, etc.) are tree-shakable, avoiding bundle bloat. Key capabilities:

- **BLAS Level 1–3:** `ddot`, `dgemm`, `dgemv`, typed-array-backed matrix operations
- **Special functions:** Bessel functions (J0, J1, Jn, Y0, Y1), Gamma, incomplete Gamma, Beta, incomplete Beta, error function (Erf, Erfc), Riemann Zeta, Hurwitz Zeta, Digamma, polygamma
- **Probability distributions:** 200+ distributions with PDF, CDF, quantile, MGF, mean, variance implementations
- **Typed arrays:** Float32/Float64/Int32/Uint8 array utilities with proper NaN and Infinity handling

**Best for:** Server-side scientific computing (Node.js), production applications requiring individual function-level imports.

### ndarray + scijs ecosystem — `ndarray`, `scijs`

**`ndarray`** provides strided, multidimensional views over typed arrays — equivalent to NumPy's `ndarray` with `strides`, `offset`, and `shape`. Slicing operations are O(1) (view semantics, no copy). The **scijs** ecosystem provides 100+ composable modules: `ndarray-ops` (element-wise arithmetic), `ndarray-fft` (multidimensional FFT), `cwise` (typed array expression compiler), `ndarray-linear-algebra` (LAPACK-style decompositions).

**Key use cases:** High-performance numerical pipelines, image processing, multidimensional data manipulation with minimal allocation.

### Sylvester

Classical vector and matrix math library. Provides `Vector` and `Matrix` classes with operations: dot product, cross product, matrix inversion, determinant, transpose, eigenvalue approximation. Minimal dependencies; no typed arrays. Suitable for small-scale geometric computations but outclassed by `ml-matrix` or `@stdlib/blas` for numerical work.

### ml-matrix — `ml-matrix`

TypeScript-first dense matrix library from the ml.js ecosystem. Full decompositions: LU (with pivoting), QR (Householder), Cholesky, SVD (Golub-Reinsch), EVD (eigenvalue decomposition for symmetric and non-symmetric matrices). Exposes Matrix class with method chaining; supports in-place and functional operations. Well-maintained, typed, and actively used as a dependency in `ml-pca`, `ml-regression`, and related packages.

---

## 4. Statistics & Probability

### jStat — `jstat`

Statistics library modeled on R's API surface. Supports:
- **Distributions:** normal, Student's t, F, chi-squared, beta, gamma, Poisson, binomial, uniform, exponential, Cauchy, Weibull, log-normal — each with PDF, CDF, inverse CDF, mean, variance
- **Statistical tests:** t-test (one/two-sample, paired), F-test, chi-square test, ANOVA
- **Regression:** OLS linear regression with coefficient estimation, R², residuals
- **Matrix statistics:** covariance matrix, correlation matrix

### simple-statistics — `simple-statistics`

Zero-dependency, functional-style statistics library. Covers descriptive statistics (mean, median, mode, geometric mean, harmonic mean, variance, standard deviation, IQR, skewness, kurtosis), linear regression, polynomial regression, Pearson and Spearman correlations, k-means clustering, Jenks natural breaks, Bayesian classifier, perceptron. Tree-shakable ES modules. Designed for clarity over performance; each function is a pure transformation over arrays.

### danfo.js — `danfojs`

Pandas-equivalent DataFrame API for JS, built on TensorFlow.js tensors as the underlying storage layer. Supports:
- `DataFrame` and `Series` with labeled axes
- `groupby`, `pivot`, `merge`, `concat`, `resample` (time series)
- Statistical aggregations: `mean()`, `std()`, `describe()`, `corr()`, `cov()`
- CSV/JSON read/write; Excel import via `xlsx`
- Plotting via Plotly.js integration

The TensorFlow.js backend enables GPU-accelerated operations on large DataFrames.

### @stdlib/stats

Modular statistical functions from the stdlib ecosystem. Individual packages for sample statistics, inference, and probability. See `@stdlib/stdlib` above; the stats sub-namespace is importable independently as `@stdlib/stats-*` packages.

---

## 5. GPU-Accelerated Compute

### TensorFlow.js — `@tensorflow/tfjs`

Full ML framework with a tensor math core. GPU dispatch via WebGL (mature) and WebGPU (experimental). Key numerical capabilities beyond ML:

- **Tensor ops:** broadcasting, reshape, transpose, slice, gather, scatter
- **Linear algebra:** `tf.linalg.matMul`, `tf.linalg.bandPart`, `tf.linalg.cholesky`, `tf.linalg.triangularSolve`
- **FFT:** `tf.spectral.fft`, `tf.spectral.rfft`, `tf.spectral.ifft`
- **Autodiff:** `tf.grad()`, `tf.grads()`, `tf.variableGrads()` — reverse-mode AD over arbitrary computation graphs
- **Node.js CUDA:** `@tensorflow/tfjs-node-gpu` binds to libtensorflow with CUDA support for server-side GPU computation

### GPU.js — `gpu.js`

JIT-compiles annotated JavaScript functions to **WGSL** (WebGPU) or **GLSL** (WebGL2) compute shaders at runtime. The `createKernel()` API accepts a JS function body and rewrites it to a GPU shader; output is a typed array. Supports thread indexing via `this.thread.x/y/z`. Well-suited for raw parallel numerical workloads: N-body gravitational simulation, image convolution, matrix operations, Monte Carlo methods. Falls back to CPU when no GPU is available.

### TypeGPU — `typegpu`

TypeScript-first WebGPU abstraction layer. Generates type-safe WGSL shader source from TypeScript type definitions at build time, eliminating runtime shader string construction. Provides CPU/GPU buffer interop with strong typing; bind group layouts are inferred from TS types. Targets production WebGPU workloads where shader correctness and TypeScript integration are priorities.

### Taichi.js — `taichi.js`

JavaScript port of the Taichi programming model. WebGPU-native compute with a data-oriented programming model; fields and kernels map directly to GPU compute passes. Supports sparse data structures on GPU, differentiable programming constructs, and physically-based simulation primitives. Best suited for research-grade simulation where the Taichi kernel abstraction reduces boilerplate.

### gpu-io

WebGL2-based GPU compute library targeting physics simulations and mathematical calculations. Provides `GPUComposer`, `GPUProgram`, and `GPULayer` abstractions over WebGL2 framebuffers for ping-pong computation. Used extensively for reaction-diffusion systems, cellular automata (Game of Life, Lenia), fluid simulation (Navier-Stokes), and Turing pattern generation. No WebGPU requirement; runs on any WebGL2-capable device.

---

## 6. WebAssembly-Accelerated Math

### Rapier.js — `@dimforge/rapier2d`, `@dimforge/rapier3d`

Rust-implemented rigid body physics engine (Rapier) compiled to WebAssembly via `wasm-pack`. Provides the fastest JS-accessible physics engine available, benchmarking significantly ahead of pure-JS alternatives. Features: rigid body dynamics (dynamic, kinematic, fixed), continuous collision detection (CCD), convex and concave collider shapes, joints (revolute, prismatic, fixed, spherical, generic 6-DOF), character controller, event system for contact and intersection. TypeScript bindings are auto-generated from Rust types.

### OpenCV.js — `opencv.js`

OpenCV 4.x compiled to WebAssembly via Emscripten, with optional SIMD WASM builds for ~2x additional speedup over scalar WASM. Exposes the full OpenCV API surface in JS: image filtering, feature detection (SIFT, ORB, FAST), optical flow (Lucas-Kanade, Farneback), contour finding, homography estimation, camera calibration, Haar/LBP cascade classifiers. Performance is 20–30x faster than equivalent pure-JS implementations. Runs in Web Workers for non-blocking execution.

### Ammo.js

JavaScript/WASM port of the **Bullet Physics** engine via Emscripten. Supports rigid body dynamics, soft body simulation (cloth, rope, volumetric deformation), vehicle dynamics (raycast vehicle model), constraint types (hinge, generic 6-DOF, point-to-point, cone-twist, slider), and broadphase collision detection (DBVT, SAP). Used in Three.js and Babylon.js physics integrations. No TypeScript types in the main build; community type packages exist.

### Cannon-es — `cannon-es`

Modernized fork of the unmaintained `cannon.js`. Pure JavaScript 3D physics; no WASM dependency, making it easier to debug but slower than Rapier. Supports rigid bodies, broadphase (AABB tree, naive), narrowphase (GJK/EPA for convex shapes), constraint solver (iterative impulse), materials and contact materials, friction/restitution. ES module build with TypeScript declarations.

| Library | Backend | 3D/2D | TypeScript | Performance |
|---|---|---|---|---|
| Rapier.js | Rust WASM | Both | Yes | Fastest |
| Ammo.js | C++ WASM | 3D | Partial | Fast |
| Cannon-es | Pure JS | 3D | Yes | Moderate |
| Matter.js | Pure JS | 2D | Partial | Moderate |

---

## 7. Automatic Differentiation / Autograd

Autodiff computes exact derivatives of programs, not numerical approximations (finite differences) or symbolic derivatives (CAS). Two modes:

- **Forward mode:** propagates dual numbers (value + derivative) through the computation graph; O(n) cost for scalar output w.r.t. n inputs. Efficient when input dimension is small.
- **Reverse mode (backpropagation):** records a computation tape forward, then accumulates gradients backward; O(m) cost for m outputs w.r.t. all inputs. Efficient when output dimension is small (the standard ML case).

### TensorFlow.js autograd

`tf.grad(f)` returns a function computing the gradient of scalar `f` w.r.t. its first argument. `tf.grads(f)` generalizes to multiple arguments. `tf.variableGrads(f)` computes gradients w.r.t. all `tf.Variable` instances in scope — the standard training loop primitive. Operates over the WebGL/WebGPU computation graph; GPU-resident gradients avoid CPU round-trips.

### deepnet.js

Standalone reverse-mode autograd library for JS. Builds a dynamic computation graph (define-by-run, like PyTorch eager mode); calling `.backward()` on a scalar tensor accumulates `.grad` on all leaf tensors. Supports arithmetic, trigonometric, and reduction operations with correct gradient implementations.

### Micrograd (JS ports)

Andrej Karpathy's `micrograd` (Python) has multiple JS ports implementing the same pedagogical reverse-mode autograd engine: a `Value` class wrapping a scalar with a `_backward` closure and a topological sort for backpropagation. Not production-ready but ideal for understanding gradient flow, the chain rule through arbitrary DAGs, and implementing custom operations with hand-written backward passes.

---

## 8. Differential Equations (ODE/PDE)

### numeric.js ODE solvers

`numeric.dopri()` implements the **Dormand-Prince** RK4(5) adaptive step-size method (same algorithm as MATLAB's `ode45`). `numeric.eig()` supports eigenvalue methods for linear ODE stability analysis. Error control via local truncation error estimates; automatic step doubling/halving.

### JSXGraph — `jsxgraph`

Primarily an interactive geometry and function-plotting library, but includes ODE visualization tools: slope field rendering, Euler method stepper, and Runge-Kutta visualization. Used in mathematics education platforms. SVG/VML/Canvas rendering backends; no external dependencies.

### VisualPDE — (browser app, no npm)

GPU-shader-based PDE solver running entirely in WebGL compute passes. Supports 1D and 2D PDEs including reaction-diffusion systems (Gray-Scott, Brusselator), wave equation, heat equation, Schrödinger equation, and Turing pattern formation. Users define PDE coefficients interactively; the WebGL fragment shader evaluates finite-difference discretizations at interactive framerates. Not a library — a browser application with shareable equation URLs.

### ode45-cash-karp — `ode45-cash-karp`

Standalone Runge-Kutta-Fehlberg (RKF45 / Cash-Karp variant) adaptive step ODE integrator. Accepts a vector-valued ODE `dy/dt = f(t, y)`, initial conditions, time span, and tolerance parameters. Returns solution arrays at adaptive time steps. Minimal dependencies; suitable for embedding in larger scientific computing pipelines.

---

## 9. Signal Processing & Fourier Analysis

### DSP.js — (no npm; include via CDN/copy)

Full digital signal processing library. FFT and IFFT (power-of-2 Cooley-Tukey), linear convolution and correlation, windowing functions (Hann, Hamming, Blackman, Bartlett, Kaiser), FIR filter design (windowed sinc method), IIR filter design (Butterworth, bilinear transform), oscillator implementations (sine, square, sawtooth, triangle). Compatible with `AudioWorklet` for real-time audio processing.

### fft.js — `fft.js`

High-performance Cooley-Tukey FFT optimized for JavaScript engines. Operates on interleaved real/imaginary typed arrays. Benchmarks significantly faster than naive recursive FFT implementations due to iterative butterfly computation and cache-friendly memory layout. Power-of-2 length restriction; use zero-padding for arbitrary-length inputs.

### Meyda — `meyda`

Real-time audio feature extraction library integrating with the Web Audio API. Computes on each audio frame: MFCCs (Mel-Frequency Cepstral Coefficients), spectral centroid, spectral flatness, spectral rolloff, chroma, zero-crossing rate (ZCR), RMS energy, loudness (Zwicker model), perceptual spread. Uses the Web Audio `ScriptProcessorNode` or `AudioWorklet`; configurable buffer size and hop size.

### ml-fft

FFT implementation from the ml.js ecosystem. Standard Cooley-Tukey; integrates with `ml-matrix` and other ml.js modules for spectral analysis pipelines.

### Web Audio API — (native browser)

The browser's built-in audio graph. `AnalyserNode` provides real-time FFT via `getFloatFrequencyData()` (dB-scaled) and `getByteTimeDomainData()` (waveform). `FFT size` configurable as powers of 2 (32–32768). Not a library but the foundational API that DSP.js and Meyda extend. `AudioWorklet` enables custom sample-accurate processing in a dedicated thread.

---

## 10. Cryptography & Number Theory

### noble-curves — `@noble/curves`

Audited, zero-dependency elliptic curve cryptography library in TypeScript. Implements:
- `secp256k1` (Bitcoin, Ethereum ECDSA/Schnorr)
- `ed25519` / `ed448` (EdDSA, Diffie-Hellman via `x25519`, `x448`)
- `p256` / `p384` / `p521` (NIST curves, TLS)
- `Ristretto255` / `decaf448` (prime-order groups for ZK protocols)
- Pairings-friendly curves: `bls12-381`, `bn254`

All operations use constant-time algorithms to prevent timing side-channels. Tree-shakable: import individual curves. Passes third-party security audits (Cure53).

### noble-hashes — `@noble/hashes`

Pure TypeScript hash function implementations: SHA-256, SHA-512, SHA-3 (Keccak-256, SHA3-224/256/384/512), BLAKE2b, BLAKE2s, BLAKE3, RIPEMD-160, HMAC, HKDF, PBKDF2, scrypt, argon2. No native bindings; runs in browser and Node.js identically. Constant-time comparisons via `equalBytes`.

### node-forge — `node-forge`

Full PKI implementation in JS: RSA (PKCS#1, OAEP, PSS), AES (CBC, CFB, OFB, CTR, GCM), 3DES, RC2, Diffie-Hellman, HMAC, X.509 certificate generation and parsing, PKCS#7, PKCS#12, ASN.1 encoding/decoding, TLS 1.0–1.2 (pure JS implementation). Useful for certificate manipulation and legacy protocol support in environments without native crypto APIs.

### jsbn

Tom Wu's BigInteger library for RSA and ECC in pure JavaScript. Supports arbitrary-precision integer arithmetic: modular exponentiation (`modPow`), modular inverse, GCD, primality (Miller-Rabin), bitwise operations. Still used as a low-level dependency in some cryptographic libraries where BigInt built-ins are not available.

### Decimal.js — `decimal.js`

Arbitrary-precision base-10 decimal arithmetic. Configurable precision (1–1e9 significant digits) and rounding mode. Implements `+`, `-`, `*`, `/`, `%`, `pow`, `sqrt`, `cbrt`, `exp`, `ln`, `log2`, `log10`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`. Used as the BigNumber backend in Math.js. Critical for financial computation (avoiding IEEE 754 binary floating-point errors) and high-precision cryptographic computations.

---

## 11. Computational Geometry

### d3-delaunay — `d3-delaunay`

Fastest Delaunay triangulation in JavaScript, based on Mapbox's `delaunator` (Bowyer-Watson incremental algorithm on a super-triangle). Wraps `delaunator` with a Voronoi diagram generator: `DelaunayTriangulation` → `VoronoiDiagram` with cell polygon iteration. Handles degenerate inputs (collinear points, duplicates). Used in D3.js force simulations and spatial partitioning.

### RBush — `rbush`

High-performance R-tree implementation for 2D spatial indexing. Bulk-load (`load`) using the OMT (Object-based Overlap-Minimizing packing) algorithm; single-item `insert`/`remove`; `search(bbox)` and `collides(bbox)` queries. Used in geospatial applications, collision detection preprocessing, and viewport culling.

### hull.js

2D convex hull algorithms: Graham scan and Jarvis march (gift wrapping). Accepts arrays of `[x, y]` points; returns ordered hull vertices. Also supports concave hull (alpha-shape) approximation via configurable concavity parameter.

### polybool

Polygon boolean operations (union, intersection, difference, XOR) using the Greiner-Hormann algorithm with epsilon-robust intersection detection. Handles self-intersecting polygons, holes, and multi-polygon inputs. Output is a list of contour arrays suitable for Canvas or SVG rendering.

### geometric — `geometric`

Lightweight 2D geometry library: polygon area (shoelace formula), centroid, convex hull, point-in-polygon test, line intersection, distance functions, angle computation. Pure functional API; no classes.

---

## 12. Graph Theory & Network Analysis

### Graphology — `graphology`

The most actively maintained graph library in the JS ecosystem. Supports directed, undirected, mixed, and multi-graphs (parallel edges) in a unified API. TypeScript throughout; strong typing on node/edge attributes. ~50K weekly downloads. Core operations: `addNode`, `addEdge`, `dropNode`, `updateEdgeAttribute`, adjacency iteration, neighbor iteration, serialization to/from JSON (graphology-gexf, graphology-graphml).

### graphology-* ecosystem

Modular algorithm packages on top of Graphology:
- `graphology-shortest-path`: Dijkstra (weighted) and unweighted BFS shortest path; `bidirectional-dijkstra` for large graphs
- `graphology-pagerank`: PageRank with configurable damping factor and convergence tolerance
- `graphology-metrics`: betweenness centrality, closeness centrality, eccentricity, modularity score
- `graphology-communities-louvain`: Louvain modularity-maximization community detection
- `graphology-traversal`: BFS/DFS iterators with depth limits
- `graphology-layout-forceatlas2`: ForceAtlas2 layout algorithm (WebWorker support)
- `graphology-generators`: random graph models (Erdos-Rényi, Barabási-Albert, path, complete)

### JSNetworkX — (no active npm)

JavaScript port of NetworkX 1.6 (Python). Implements classic graph algorithms: shortest paths (Dijkstra, Bellman-Ford, Floyd-Warshall), spanning trees (Prim, Kruskal), flow algorithms (max flow), clustering coefficients, bipartite graph utilities. Integrates with D3.js for visualization. The Python port fidelity makes it useful when porting NetworkX-based algorithms to JS, but it is minimally maintained.

### Cytoscape.js — `cytoscape`

Full-featured graph analysis and visualization library. Analysis: Dijkstra, A*, Bellman-Ford, Floyd-Warshall, minimum spanning tree (Kruskal), PageRank, betweenness centrality, Karger-Stein min-cut, topological sort, strongly connected components (Tarjan). Layout algorithms: force-directed (Cola, Cose), hierarchical (Dagre), circular, grid, breadthfirst. TypeScript declarations included; extensible via plugin architecture.

---

## 13. Optimization & Numerical Methods

### ml-levenberg-marquardt — `ml-levenberg-marquardt`

Nonlinear least-squares curve fitting via the Levenberg-Marquardt algorithm (damped Gauss-Newton). Accepts a parametric model function and observed data; returns optimal parameters minimizing the sum of squared residuals. Supports analytical or numerical Jacobian computation; configurable damping factor, gradient tolerance, and iteration limits. From the ml.js ecosystem.

### numeric.js optimization

`numeric.uncmin()` — unconstrained minimization using the **Polak-Ribière conjugate gradient** method with Wolfe-condition line search. Requires gradient; uses finite differences if not provided. Suitable for smooth, unconstrained problems up to moderate dimensionality (~100s of variables).

### BFGS / L-BFGS in JS

No canonical npm package dominates, but several implementations exist:
- `fmin` — BFGS and L-BFGS-B (box-constrained) in pure JS; Wolf conditions satisfied
- `optimization-js` — gradient-free (Nelder-Mead, Powell) and gradient-based (gradient descent, conjugate gradient) methods
- TensorFlow.js includes L-BFGS through `tf.train.adam` and related optimizers for tensor-valued objectives

### Nlinfit equivalents

MATLAB's `nlinfit` maps to `ml-levenberg-marquardt` for nonlinear least squares. Constrained nonlinear optimization (equivalent to MATLAB's `fmincon`) has limited pure-JS support; typical approaches use `optimization-js` (Nelder-Mead) for gradient-free problems or WebAssembly-compiled NLopt for constrained problems.

---

## 14. Machine Learning Math Primitives

### Brain.js — `brain.js`

GPU-accelerated neural network library using GPU.js for WebGL-dispatched matrix operations. Architectures: feedforward MLP, RNN, LSTM, GRU. Trains via RPROP (resilient backpropagation) or gradient descent with configurable learning rate and momentum. Automatic CPU fallback. Well-suited for in-browser supervised learning on small-to-medium datasets.

### Synaptic.js — `synaptic`

Architecture-agnostic neural network library. `Network`, `Layer`, and `Neuron` primitives allow constructing arbitrary graph-structured networks. Includes pre-built `Architect` templates: Perceptron, LSTM, Liquid State Machine, Hopfield network. Training via backpropagation, Resilient Backpropagation (RPROP), or custom trainers. No external dependencies.

### ml.js ecosystem — `ml`

Umbrella package for the ml.js monorepo. Core modules:
- `ml-cart` — CART decision trees (classification and regression)
- `ml-random-forest` — Random forest classifier/regressor
- `ml-knn` — k-Nearest Neighbors with Euclidean/Manhattan distance
- `ml-pca` — PCA via SVD (ml-matrix); supports standardization, explained variance
- `ml-kmeans` — k-means and k-medians clustering with multiple initialization strategies
- `ml-regression` — linear, polynomial, exponential, power, Theil-Sen, SVM regression
- `ml-svm` — SVM classification via SMO algorithm; RBF, linear, polynomial kernels
- `libsvm-js` — LibSVM compiled to WASM for production-grade SVM

### ONNX Runtime Web — `onnxruntime-web`

Microsoft's ONNX Runtime compiled for browser and Node.js. Execution providers: WASM (default), WebGL (GPU-accelerated operators), WebGPU (experimental). Loads `.onnx` models and runs inference with correct operator semantics. Supports opsets 7–18; operator coverage varies by execution provider. Used for deploying models exported from PyTorch, TensorFlow, or scikit-learn to the browser with near-native inference speed.

### Transformers.js — `@xenova/transformers`

Hugging Face Transformers running in-browser via ONNX Runtime Web. Pre-quantized (INT8/FP16) ONNX model weights served from CDN or bundled locally. Supported pipelines: text classification, NER, question answering, summarization, translation, text generation (GPT-2, GPT-Neo), automatic speech recognition (Whisper), image classification (ViT), zero-shot classification (CLIP). Tokenizer implementations (WordPiece, BPE, SentencePiece) are fully ported to JS.

---

## 15. 3D Math & Graphics Math

### gl-matrix — `gl-matrix`

De facto standard math library for WebGL applications. All types — `vec2`, `vec3`, `vec4`, `mat2`, `mat3`, `mat4`, `quat`, `quat2` (dual quaternions) — are backed by `Float32Array` for direct GPU buffer upload. API is functional: operations take an output array as the first argument for zero-allocation hot paths. Quaternion operations include SLERP, squad, and rotation decomposition. Available in both 32-bit (`Float32Array`) and 64-bit (`Float64Array`) variants via separate import paths.

### Three.js math — `three`

Complete 3D math utility layer, independent of Three.js's renderer. Classes: `Vector2/3/4` (arithmetic, dot, cross, project, reflect, lerp), `Matrix3/4` (determinant, inverse, compose/decompose into position/quaternion/scale), `Quaternion` (SLERP, `setFromEuler`, `setFromRotationMatrix`, `setFromAxisAngle`), `Euler` (XYZ/YXZ/ZXY/ZYX/ZXZ/XZX order conventions), `Frustum` (6-plane culling), `Ray` (intersection with sphere, box, plane, triangle), `Box3`, `Sphere`, `Plane`, `Triangle`, `Color`. Useful as a standalone math dependency even without Three.js's rendering pipeline.

### glsl-* scijs ecosystem

A collection of scijs packages providing GLSL-compatible mathematical operations in JS: `glsl-inverse` (matrix inverse), `glsl-transpose`, `glsl-look-at`, `glsl-projection` (perspective/orthographic projection matrices), `glsl-ray-sphere-intersection`. These packages match GLSL built-in function signatures, enabling symmetric CPU (JS) / GPU (GLSL) implementations.

---

## 16. Precision & Exact Arithmetic

### Fraction.js — `fraction.js`

Exact rational arithmetic using BigInt internally. Represents numbers as irreducible `p/q` fractions; all arithmetic operations (`add`, `sub`, `mul`, `div`, `pow`, `mod`) are exact. `toFraction()`, `toLatex()`, and `valueOf()` converters. Used as the `Fraction` type backend in Math.js.

### Decimal.js — `decimal.js`

*(See also Cryptography section.)* Arbitrary precision base-10 arithmetic with configurable precision and rounding modes (`ROUND_UP`, `ROUND_DOWN`, `ROUND_CEIL`, `ROUND_FLOOR`, `ROUND_HALF_UP`, `ROUND_HALF_EVEN` (banker's rounding), etc.). Implements full transcendental function suite. The `toSignificantDigits()` and `toDecimalPlaces()` methods provide controlled output formatting. Key differentiator from `big.js`: full trigonometric and logarithmic functions.

### big.js — `big.js`

Minimal arbitrary-precision decimal library; 6KB minified. Supports `+`, `-`, `*`, `/`, `pow`, `sqrt`, `abs`, `round`, `toPrecision`. No trigonometric or logarithmic functions; no configurable rounding modes beyond basic. Suitable when only the four arithmetic operations with high precision are needed and bundle size is critical.

### BigInteger.js — `big-integer`

Arbitrary-precision integer arithmetic. Operations: `add`, `subtract`, `multiply`, `divide`, `mod`, `pow`, `modPow` (for RSA), `gcd`, `lcm`, bitwise (`and`, `or`, `xor`, `not`, `shiftLeft`, `shiftRight`), `isProbablePrime` (Miller-Rabin with configurable certainty), `nextProbablePrime`. Polyfills `BigInt` operations on environments lacking native BigInt.

| Library | Type | Transcendentals | Size | Use case |
|---|---|---|---|---|
| `fraction.js` | Rational (p/q) | No | Small | Exact fractions |
| `decimal.js` | Decimal | Yes | Medium | High-precision float |
| `big.js` | Decimal | No | 6KB | Minimal precision |
| `big-integer` | Integer | No | Small | Modular arithmetic |

---

## 17. Visualization of Mathematical Structures

### D3.js — `d3`

SVG/Canvas data-driven visualization framework. Mathematical utilities: `d3-contour` (marching squares for contour plots), `d3-delaunay` (Voronoi/Delaunay), `d3-force` (n-body force simulation with many-body, link, collision, and custom forces), `d3-geo` (spherical geometry, projections), `d3-hierarchy` (tree, cluster, pack, partition, treemap layouts), `d3-interpolate` (numerical and color interpolation). Low-level; requires composing primitives for scientific plots.

### Plotly.js — `plotly.js`

High-level scientific plotting library supporting 40+ chart types. Mathematically relevant: 3D surface plots, contour maps, heatmaps, scatter3d, cone plots (vector fields), streamtube plots, violin plots, 2D histograms, ternary diagrams, polar charts. WebGL-backed (`scattergl`, `heatmapgl`) for large datasets. Declarative JSON spec; Python/R Plotly compatibility. Best for production scientific dashboards.

### Vega-Lite — `vega-lite`

Declarative grammar of graphics with statistical transforms expressed in JSON. Built-in transforms: `aggregate`, `bin`, `calculate`, `density`, `filter`, `fold`, `impute`, `joinaggregate`, `loess`, `quantile`, `regression`, `sample`, `stack`, `timeUnit`, `window`. Compiles to Vega, which renders to SVG or Canvas. Suitable for composable multi-view statistical visualizations.

### Mafs — `mafs`

React component library for interactive mathematical visualization. Components: `Plot.OfX`, `Plot.OfY`, `Plot.Parametric`, `Plot.VectorField`, `Plot.Inequality`, `Vector`, `Transform`, `Point`, `Circle`, `Ellipse`, `Polygon`, `LaTeX`. Supports interactive draggable points with controlled state. Designed for embedding mathematical figures in React applications; clean API, minimal configuration.

### Function Plot — `function-plot`

D3-based 2D mathematical function plotter. Evaluates and renders explicit functions `y=f(x)`, implicit equations `f(x,y)=0` (marching squares), and parametric curves `(x(t), y(t))`. Supports derivative overlay, annotations, linked plots, zoom/pan. Integrates with `math.js` expression parser for string-based function input.

### JSXGraph — `jsxgraph`

Interactive geometry and analysis library. Constructs geometric objects (points, lines, circles, conics, curves, polygons) programmatically; all objects respond to drag interactions. Numerical methods built in: Newton's method visualization, ODE solvers, Runge-Kutta slope fields, root finding. SVG primary rendering with Canvas fallback; embeds in any HTML element.

---

## 18. Cellular Automata, Chaos Theory & Fractals

### gpu-io (cellular automata)

GPU-accelerated cellular automata and reaction-diffusion simulation. The `GPUComposer` ping-pong technique updates grid state each frame via WebGL fragment shaders — equivalent to a 2D texture as state vector, updated by a custom kernel. Supports Conway's Game of Life, Brian's Brain, Lenia (continuous CA), Gray-Scott and Gierer-Meinhardt reaction-diffusion, and custom rule sets defined in GLSL.

### Mandelbrot / Julia Sets / IFS Fractals

No dominant npm package; standard implementations use:
- **Canvas 2D API** with escape-time algorithm: iterate `z_{n+1} = z_n^2 + c` per pixel; color by iteration count or smooth coloring (continuous dwell via `log(log|z|)`). Arbitrary-precision zoom requires multi-precision arithmetic (`decimal.js` or custom perturbation theory with double-double arithmetic)
- **WebGL fragment shaders** for GPU-parallelized escape-time; real-time zoom at 60fps; GLSL float precision limits zoom depth to ~1e-6 without perturbation theory
- **IFS (Iterated Function Systems):** affine transformations applied stochastically (chaos game); renders Barnsley fern, Sierpinski triangle; trivially implemented in Canvas 2D

### Strange Attractors (Lorenz, Rössler)

Typically pure-JS canvas loops integrating the attractor ODEs with RK4 or Euler:
- **Lorenz:** `dx/dt = σ(y-x)`, `dy/dt = x(ρ-z)-y`, `dz/dt = xy-βz` with σ=10, ρ=28, β=8/3
- **Rössler:** `dx/dt = -y-z`, `dy/dt = x+ay`, `dz/dt = b+z(x-c)`

Trajectory rendered as a polyline on Canvas or as a 3D line in Three.js. `ode45-cash-karp` handles adaptive step integration; fixed-step RK4 is simpler and sufficient for visualization.

---

## 19. Physics Simulation (Beyond Rigid Body)

### Matter.js — `matter-js`

2D rigid body physics with constraint-based simulation. Features: compound bodies via composites, constraint types (distance, revolute), static bodies, sensor colliders, sleeping bodies optimization. Broadphase: grid or AABB tree. Rendering via Canvas or SVG (or headless). Suitable for 2D game physics and educational simulations; less accurate than Rapier for production dynamics.

### p2.js

2D rigid body physics with an emphasis on constraint types: distance, lock, revolute, prismatic, gear, and spring constraints. Contact materials define friction and restitution per material pair. Island-based solver with warm-starting. More constraint variety than Matter.js; less maintained.

### Rapier.js — `@dimforge/rapier2d` / `@dimforge/rapier3d`

*(See WASM section.)* Position-based dynamics for soft bodies; constraint solver for articulated rigid body chains (robots, ragdolls). Contact events, proximity events, and ray/shape casting APIs. The 2D and 3D packages are independent WASM builds.

### oimo.js — `oimo`

Lightweight 3D rigid body physics engine. Broad phase via DBVT; narrow phase via GJK/EPA; sequential impulse solver. Smaller footprint than Ammo.js; TypeScript definitions available. Suitable for mobile web where WASM loading overhead is a concern.

### PhysicsJS — `physicsjs`

Modular physics engine with a behavior/renderer plugin architecture. Integrators: Verlet, Runge-Kutta. Behaviors: newtonian gravity, constant acceleration, edge boundary, body-body collision. Custom renderers: Canvas, Pixi.js. Designed for extensibility; core is minimal and behaviors are attached as composable modules.

---

## 20. Reactive / Streaming Math

### RxJS — `rxjs`

Reactive extensions for JavaScript. Mathematical pipelines over observable data streams using higher-order operators:
- `scan(accumulator, seed)` — running fold; streaming mean, variance, Kalman filter state
- `reduce(accumulator)` — final aggregation over completed stream
- `bufferTime(ms)` / `bufferCount(n)` — windowed batch collection for sliding statistics
- `window*` operators — overlapping or non-overlapping windows for streaming FFT or histogram updates
- `combineLatest`, `zip`, `withLatestFrom` — multi-stream synchronization for sensor fusion
- `throttleTime`, `debounceTime`, `sampleTime` — temporal decimation

Composing RxJS operators produces declarative statistical pipelines equivalent to stream processing frameworks (Kafka Streams, Apache Flink) in-browser.

### Observable HQ Plot — `@observablehq/plot`

D3-based statistical visualization library with a mark-based grammar. Built-in statistical transforms: `bin`, `group`, `normalize`, `stack`, `window` (rolling statistics), `diff`, `sort`. Designed for streaming and reactive data updates; integrates naturally with RxJS or native reactive stores. Particularly strong for exploratory data analysis dashboards where data transforms and visual encoding are specified declaratively.

---

## Quick Reference: Package Index

| Category | Package | npm install |
|---|---|---|
| Quantum | Q.js | `quantum-javascript` |
| Quantum | quantum-circuit | `quantum-circuit` |
| CAS | Algebrite | `algebrite` |
| CAS | Math.js | `mathjs` |
| CAS | Nerdamer | `nerdamer` |
| Numerical | numeric.js | `numeric` |
| Numerical | stdlib | `@stdlib/stdlib` |
| Numerical | ndarray | `ndarray` |
| Numerical | ml-matrix | `ml-matrix` |
| Statistics | jStat | `jstat` |
| Statistics | simple-statistics | `simple-statistics` |
| Statistics | danfo.js | `danfojs` |
| GPU | TensorFlow.js | `@tensorflow/tfjs` |
| GPU | GPU.js | `gpu.js` |
| GPU | TypeGPU | `typegpu` |
| WASM | Rapier 3D | `@dimforge/rapier3d` |
| WASM | Cannon-es | `cannon-es` |
| Autograd | deepnet.js | `deepnet.js` |
| ODE | ode45-cash-karp | `ode45-cash-karp` |
| Signal | fft.js | `fft.js` |
| Signal | Meyda | `meyda` |
| Crypto | noble-curves | `@noble/curves` |
| Crypto | noble-hashes | `@noble/hashes` |
| Crypto | Decimal.js | `decimal.js` |
| Geometry | d3-delaunay | `d3-delaunay` |
| Geometry | RBush | `rbush` |
| Graph | Graphology | `graphology` |
| Graph | Cytoscape.js | `cytoscape` |
| Optimization | LM | `ml-levenberg-marquardt` |
| ML | Brain.js | `brain.js` |
| ML | ONNX Runtime | `onnxruntime-web` |
| ML | Transformers.js | `@xenova/transformers` |
| 3D Math | gl-matrix | `gl-matrix` |
| 3D Math | Three.js | `three` |
| Precision | Fraction.js | `fraction.js` |
| Precision | big.js | `big.js` |
| Precision | BigInteger.js | `big-integer` |
| Visualization | D3.js | `d3` |
| Visualization | Plotly.js | `plotly.js` |
| Visualization | Mafs | `mafs` |
| Visualization | JSXGraph | `jsxgraph` |
| Physics 2D | Matter.js | `matter-js` |
| Physics 2D | p2.js | `p2` |
| Reactive | RxJS | `rxjs` |
| Reactive | Observable Plot | `@observablehq/plot` |
