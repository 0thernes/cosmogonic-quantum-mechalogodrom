<!-- reviewed: 2026-07-03 | comprehensive performance deep dive vs Gemini 3.1 Pro High recommendations -->

# Performance Baseline — Cosmogonic Quantum Mechalogodrom (2026-07-03)

**Date:** 2026-07-03  
**Context:** Comprehensive performance deep dive analysis against Gemini 3.1 Pro High recommendations for browser-based 50k-agent simulations with complex neural networks and consciousness indicators.

## Current Performance State

### Hardware Context

- **CPU:** Intel Core Ultra 9 275HX (16 cores)
- **GPU:** RTX 5070 Ti
- **Browser:** GitHub Pages static hosting (WebGL2, no WebGPU)
- **Current Performance:** 3-10 FPS at 50k agents (reported by user)

### Architecture Baseline

**Rendering:**

- WebGL2 via Three.js (no WebGPU)
- Instanced rendering via `InstancedEntityRenderer` (single draw calls for 50k entities)
- Frame governor adaptive quality (DPR → post-FX → shadows degradation)
- 6-tier quality system (phone 1k → tablet 2k → laptop 5k → desktop 10k → ultra 25k → mega 50k)

**Simulation:**

- Single JavaScript thread (no Web Workers)
- All neural evaluation on CPU (no GPU compute)
- FP32 storage (no quantization)
- 50k agents × 70 brain parameters = 3.5M FP32 values (~14 MB)
- CPU-GPU round-trip for neural states every frame

**Memory:**

- Entity memory: ~14 MB (3.5M FP32 values)
- Total simulation memory: ~50 MB (not a bottleneck)
- No memory allocation in hot paths (preallocated Float32Array buffers)

**Threading:**

- Main thread only (16-core CPU underutilized)
- ADR 0010 Hybrid architecture designed but not implemented
- No SharedArrayBuffer usage
- No Web Workers

**WebAssembly:**

- Native C++ exists in `native/` directory (sibling reliquary)
- No Wasm compilation for browser simulation
- All logic in TypeScript/JavaScript

## Performance Bottlenecks

### Critical Gaps (Identified by Gemini Analysis)

1. **Single-Thread Simulation**
   - 50k agents on one JS thread despite 16-core CPU
   - Intel 275HX cannot utilize multi-threading capability
   - **Impact:** 4-8x potential speedup lost

2. **No WebGPU Compute**
   - All neural evaluation on CPU despite RTX 5070 Ti GPU
   - No GPU compute shaders for brain evaluation
   - **Impact:** 10-100x potential speedup lost

3. **No WebAssembly**
   - Native C++ exists but not compiled to Wasm
   - No SIMD optimization in browser code
   - **Impact:** 2-5x potential speedup lost

4. **FP32 Storage**
   - All weights stored as FP32 (no FP16/INT8 quantization)
   - 50k × 70 params = 3.5M FP32 values
   - **Impact:** 50% memory reduction lost, 2-4x cache efficiency lost

5. **CPU-GPU Round-Trip**
   - Neural states computed on CPU, uploaded to GPU every frame
   - No transform feedback or unified buffer storage
   - **Impact:** Bandwidth waste, thermal throttling

## Performance Targets

### Current Baseline

- **Entity Count:** 50k (mega tier)
- **FPS:** 3-10 FPS (reported)
- **Thread Utilization:** 1/16 cores (6.25%)
- **GPU Utilization:** Rendering only (no compute)
- **Memory:** ~50 MB (not bottleneck)

### Phase 1 Targets (Immediate Wins)

- **Entity Count:** 50k (maintained)
- **FPS:** 30-60 FPS (4-6x improvement)
- **Thread Utilization:** 1/16 cores (unchanged)
- **GPU Utilization:** Rendering only (unchanged)
- **Memory:** ~25 MB (50% reduction via quantization)

### Phase 2 Targets (WebGPU Migration)

- **Entity Count:** 100k (2x scale)
- **FPS:** 60 FPS (maintained)
- **Thread Utilization:** 1/16 cores (unchanged)
- **GPU Utilization:** Compute + rendering (10-100x speedup)
- **Memory:** ~25 MB (quantized)

### Phase 3 Targets (Multi-Threading)

- **Entity Count:** 100k (maintained)
- **FPS:** 60 FPS (maintained)
- **Thread Utilization:** 16/16 cores (100% utilization)
- **GPU Utilization:** Compute + rendering
- **Memory:** ~25 MB (quantized)

### Ultimate Target

- **Entity Count:** 1M (20x scale)
- **FPS:** 60 FPS (maintained)
- **Thread Utilization:** 16/16 cores (100%)
- **GPU Utilization:** Compute + rendering (maximum)
- **Memory:** ~50 MB (quantized + efficient)

## Optimization Levers

### High-Impact (10-100x)

1. **WebGPU Compute Shaders** - Move brain eval to GPU
2. **Web Workers** - Utilize all CPU cores
3. **Batch Tensor Contraction** - Evaluate 50k brains as single operation

### Medium-Impact (4-6x)

1. **FP16/INT8 Quantization** - Halve memory, double cache efficiency
2. **GPU Motion Interpolation** - Sim at 10-15 Hz, render at 60 Hz
3. **Perceptual Priority Cascades** - Only evaluate near entities fully

### Low-Impact (2-4x)

1. **Sparse Activation** - Only evaluate top 1-5% of neural pathways
2. **GPU Noise Fields** - Pre-compile noise textures
3. **Imposter Billboarding** - 2D billboards for distant entities

## Measurement Strategy

### Current Metrics

- **Test Count:** 2,337 tests
- **Line Coverage:** 92.75%
- **Function Coverage:** 90.06%
- **Gate Status:** ✅ All green

### Performance Metrics to Track

- **Frame Time:** 16.67ms target (60 FPS)
- **CPU Utilization:** Per-core percentage
- **GPU Utilization:** Compute vs rendering split
- **Memory Usage:** Total and per-entity
- **Entity Count:** Active vs culled
- **Neural Compute Time:** Per-brain evaluation cost
- **Render Time:** Draw call count vs instanced count

### Benchmarking Approach

- Use `bun run bench` for micro-benchmarks
- Profile `world.step(dt)` call graph
- Measure hot path allocations
- Track frame time distribution
- Monitor thermal throttling

## Success Criteria

### Phase 1 Success

- 50k agents at 30-60 FPS
- 50% memory reduction
- Zero regression in determinism
- All tests passing (2,337)
- Coverage maintained (92.75% / 90.06%)

### Phase 2 Success

- 100k agents at 60 FPS
- WebGPU compute functional
- WebGL2 fallback working
- Zero regression in visual quality
- Mobile compatibility maintained

### Phase 3 Success

- 100k agents at 60 FPS with 16-core utilization
- Web Workers functional
- SharedArrayBuffer or transferable fallback
- Zero regression in determinism
- All tests passing

## Risk Assessment

### High-Risk Items

1. **GPU Float Determinism** - GPU precision varies across GPUs
2. **Web Worker Determinism** - Thread scheduling non-deterministic
3. **WebAssembly Migration** - Large refactoring effort

### Medium-Risk Items

1. **SharedArrayBuffer Headers** - Requires COOP/COEP (not available on GitHub Pages)
2. **Sparse Activation** - May change behavior
3. **Imposter Billboarding** - Visual quality regression risk

### Low-Risk Items

1. **Quantization** - Reversible, deterministic
2. **Motion Interpolation** - Mathematically sound
3. **Dual-API Fallback** - WebGL2 ensures compatibility

## Conclusion

The Cosmogonic Quantum Mechalogodrom has excellent architectural foundations (determinism, allocation-free hot paths, instanced rendering, adaptive quality) but significant performance headroom through modern browser capabilities. The comprehensive performance optimization roadmap provides a clear path to leverage Gemini 3.1 Pro High's recommendations while maintaining the project's determinism-first philosophy and universal compatibility requirements.

**Next Steps:**

1. Begin Phase 1.1 (FP16/INT8 Quantization) - highest ROI, lowest risk
2. Implement Phase 1.2 (GPU Motion Interpolation) in parallel
3. Design Phase 2.1 (Dual-Graphics API Fallback) architecture
4. Plan Phase 3.1 (Web Worker Implementation) based on ADR 0010

**Status:** Baseline established. All gates green. Ready for optimization implementation.
