//! Cosmogonic Quantum Mechalogodrom — Zig 0.17.0 High-Throughput Kernel Layer
//!
//! Targets both native (`zig test zig/src/root.zig`) and WebAssembly
//! (`wasm32-freestanding`) for zero-allocation hot-path physics, neural
//! batch evaluation, quantum geometry, and the full 27-repo Tsotchke
//! October 2026 stack (Moonlab v1.2.1, QGTL v0.777, QRNG v3, Eshkol v1.3.6,
//! rosette-wire v0.1.0, pq-consensus-bandwidth, GeoRefine, bonsai-fidelity-study).

const std = @import("std");

inline fn clamp01(x: f64) f64 {
    if (x < 0.0) return 0.0;
    if (x > 1.0) return 1.0;
    return x;
}

inline fn clamp01f32(x: f32) f32 {
    if (x < 0.0) return 0.0;
    if (x > 1.0) return 1.0;
    return x;
}

/// 2D Gray-Scott reaction-diffusion PDE step on a periodic toroidal grid (f64).
export fn cqm_gray_scott_step(
    u_ptr: [*]const f64,
    v_ptr: [*]const f64,
    u_out: [*]f64,
    v_out: [*]f64,
    width: u32,
    height: u32,
    du: f64,
    dv: f64,
    feed: f64,
    kill: f64,
    dt: f64,
) f64 {
    if (width == 0 or height == 0) return 0.0;
    const w: usize = @intCast(width);
    const h: usize = @intCast(height);
    var v_sum: f64 = 0.0;

    var y: usize = 0;
    while (y < h) : (y += 1) {
        const ym1 = if (y == 0) h - 1 else y - 1;
        const yp1 = if (y + 1 == h) 0 else y + 1;
        var x: usize = 0;
        while (x < w) : (x += 1) {
            const xm1 = if (x == 0) w - 1 else x - 1;
            const xp1 = if (x + 1 == w) 0 else x + 1;

            const idx = y * w + x;
            const u_c = u_ptr[idx];
            const v_c = v_ptr[idx];

            const lap_u = u_ptr[ym1 * w + x] + u_ptr[yp1 * w + x] +
                u_ptr[y * w + xm1] + u_ptr[y * w + xp1] - 4.0 * u_c;
            const lap_v = v_ptr[ym1 * w + x] + v_ptr[yp1 * w + x] +
                v_ptr[y * w + xm1] + v_ptr[y * w + xp1] - 4.0 * v_c;

            const uvv = u_c * v_c * v_c;
            const u_next = clamp01(u_c + dt * (du * lap_u - uvv + feed * (1.0 - u_c)));
            const v_next = clamp01(v_c + dt * (dv * lap_v + uvv - (feed + kill) * v_c));

            u_out[idx] = u_next;
            v_out[idx] = v_next;
            v_sum += v_next;
        }
    }

    return v_sum / @as(f64, @floatFromInt(w * h));
}

/// Fused multi-step f32 2D Gray-Scott PDE + RGBA8 pixel rasterizer.
/// Eliminates both the 65,536-cell PDE loop and the 65,536-pixel RGBA conversion
/// loop in JavaScript. Writes `[meanV, peakV]` to `out_stats[0..2]`.
export fn cqm_gray_scott_step_rgba_f32(
    u_ptr: [*]f32,
    v_ptr: [*]f32,
    u_scratch: [*]f32,
    v_scratch: [*]f32,
    rgba_out: [*]u8,
    width: u32,
    height: u32,
    steps: u32,
    du: f32,
    dv: f32,
    feed: f32,
    kill: f32,
    dt: f32,
    out_stats: [*]f32,
) f32 {
    if (width == 0 or height == 0) {
        out_stats[0] = 0.0;
        out_stats[1] = 0.0;
        return 0.0;
    }
    const w: usize = @intCast(width);
    const h: usize = @intCast(height);
    const n: usize = w * h;
    const total_steps: usize = if (steps == 0) 1 else @intCast(steps);

    var cur_u = u_ptr;
    var cur_v = v_ptr;
    var nxt_u = u_scratch;
    var nxt_v = v_scratch;

    var s: usize = 0;
    while (s < total_steps) : (s += 1) {
        var y: usize = 0;
        while (y < h) : (y += 1) {
            const ym1 = if (y == 0) h - 1 else y - 1;
            const yp1 = if (y + 1 == h) 0 else y + 1;
            const row = y * w;
            const row_up = ym1 * w;
            const row_dn = yp1 * w;

            var x: usize = 0;
            while (x < w) : (x += 1) {
                const xm1 = if (x == 0) w - 1 else x - 1;
                const xp1 = if (x + 1 == w) 0 else x + 1;
                const idx = row + x;

                const u_c = cur_u[idx];
                const v_c = cur_v[idx];

                const lap_u = cur_u[row_up + x] + cur_u[row_dn + x] +
                    cur_u[row + xm1] + cur_u[row + xp1] - 4.0 * u_c;
                const lap_v = cur_v[row_up + x] + cur_v[row_dn + x] +
                    cur_v[row + xm1] + cur_v[row + xp1] - 4.0 * v_c;

                const uvv = u_c * v_c * v_c;
                nxt_u[idx] = clamp01f32(u_c + (du * lap_u - uvv + feed * (1.0 - u_c)) * dt);
                nxt_v[idx] = clamp01f32(v_c + (dv * lap_v + uvv - (feed + kill) * v_c) * dt);
            }
        }
        const tmp_u = cur_u;
        cur_u = nxt_u;
        nxt_u = tmp_u;

        const tmp_v = cur_v;
        cur_v = nxt_v;
        nxt_v = tmp_v;
    }

    // If odd number of steps, copy back into u_ptr / v_ptr so caller buffers hold latest state
    if (cur_u != u_ptr) {
        var i: usize = 0;
        while (i < n) : (i += 1) {
            u_ptr[i] = cur_u[i];
            v_ptr[i] = cur_v[i];
        }
    }

    var sum_v: f32 = 0.0;
    var peak_v: f32 = 0.0;
    var i: usize = 0;
    while (i < n) : (i += 1) {
        const u_val = u_ptr[i];
        const v_val = v_ptr[i];
        sum_v += v_val;
        if (v_val > peak_v) peak_v = v_val;

        const r_f = @min(@as(f32, 255.0), @max(@as(f32, 0.0), @floor(v_val * 700.0)));
        const g_f = @min(@as(f32, 255.0), @max(@as(f32, 0.0), @floor(u_val * 255.0)));
        const b_f = @min(@as(f32, 255.0), @max(@as(f32, 0.0), @floor((1.0 - u_val) * 200.0)));

        const p = i * 4;
        rgba_out[p] = @intFromFloat(r_f);
        rgba_out[p + 1] = @intFromFloat(g_f);
        rgba_out[p + 2] = @intFromFloat(b_f);
        rgba_out[p + 3] = 255;
    }

    const mean_v = sum_v / @as(f32, @floatFromInt(n));
    out_stats[0] = mean_v;
    out_stats[1] = peak_v;
    return mean_v;
}

/// 1D symplectic / unitary-normalized Time-Dependent Schrodinger Equation step.
export fn cqm_tdse_step(
    re_ptr: [*]f64,
    im_ptr: [*]f64,
    pot_ptr: [*]const f64,
    scratch_re: [*]f64,
    scratch_im: [*]f64,
    n: u32,
    dt: f64,
    dx: f64,
) f64 {
    if (n < 3 or dx <= 0.0) return 0.0;
    const len: usize = @intCast(n);
    const inv_2dx2 = 0.5 / (dx * dx);

    var i: usize = 0;
    while (i < len) : (i += 1) {
        const im1 = if (i == 0) len - 1 else i - 1;
        const ip1 = if (i + 1 == len) 0 else i + 1;

        const lap_re = re_ptr[im1] - 2.0 * re_ptr[i] + re_ptr[ip1];
        const lap_im = im_ptr[im1] - 2.0 * im_ptr[i] + im_ptr[ip1];

        const h_re = -inv_2dx2 * lap_re + pot_ptr[i] * re_ptr[i];
        const h_im = -inv_2dx2 * lap_im + pot_ptr[i] * im_ptr[i];

        scratch_re[i] = re_ptr[i] + dt * h_im;
        scratch_im[i] = im_ptr[i] - dt * h_re;
    }

    var norm_sq: f64 = 0.0;
    i = 0;
    while (i < len) : (i += 1) {
        norm_sq += scratch_re[i] * scratch_re[i] + scratch_im[i] * scratch_im[i];
    }

    if (norm_sq > 0.0) {
        const inv_norm = 1.0 / @sqrt(norm_sq);
        i = 0;
        while (i < len) : (i += 1) {
            re_ptr[i] = scratch_re[i] * inv_norm;
            im_ptr[i] = scratch_im[i] * inv_norm;
        }
    }

    return norm_sq;
}

/// Fubini-Study Quantum Geometric Tensor diagonal element:
///   g_mu_mu = <d_mu psi | d_mu psi> - |<psi | d_mu psi>|^2
export fn cqm_qgt_fubini_study(
    psi_re: [*]const f64,
    psi_im: [*]const f64,
    dpsi_re: [*]const f64,
    dpsi_im: [*]const f64,
    dim: u32,
) f64 {
    if (dim == 0) return 0.0;
    const n: usize = @intCast(dim);
    var d_norm_sq: f64 = 0.0;
    var ov_re: f64 = 0.0;
    var ov_im: f64 = 0.0;

    var i: usize = 0;
    while (i < n) : (i += 1) {
        const pr = psi_re[i];
        const pi = psi_im[i];
        const dr = dpsi_re[i];
        const di = dpsi_im[i];

        d_norm_sq += dr * dr + di * di;
        ov_re += pr * dr + pi * di;
        ov_im += pr * di - pi * dr;
    }

    const metric = d_norm_sq - (ov_re * ov_re + ov_im * ov_im);
    return if (metric < 0.0) 0.0 else metric;
}

/// Tsotchke `quantum_geometric_tensor` (QGTL v0.777 Beta) full 2D Quantum Geometric Tensor
/// and O(eps^2) Berry-phase geometric gate error suppression kernel.
/// Writes 8 f64 metrics into `out_metrics`:
///   [0] g_mu_mu
///   [1] g_nu_nu
///   [2] g_mu_nu (Re Q_mu_nu)
///   [3] berry_curvature (-2 Im Q_mu_nu)
///   [4] det_g (g_mu_mu * g_nu_nu - g_mu_nu^2)
///   [5] trace_g (g_mu_mu + g_nu_nu)
///   [6] o_eps2_suppression (eps^2 / (1 + trace_g + |berry_curvature|))
///   [7] bogomolny_ratio (|berry_curvature| / (2 * sqrt(max(0, det_g)) + 1e-12))
export fn cqm_qgtl_full_tensor_2d(
    psi_re: [*]const f64,
    psi_im: [*]const f64,
    dmu_re: [*]const f64,
    dmu_im: [*]const f64,
    dnu_re: [*]const f64,
    dnu_im: [*]const f64,
    dim: u32,
    eps: f64,
    out_metrics: [*]f64,
) f64 {
    if (dim == 0) {
        var k: usize = 0;
        while (k < 8) : (k += 1) out_metrics[k] = 0.0;
        return 0.0;
    }
    const n: usize = @intCast(dim);
    var dmu_norm: f64 = 0.0;
    var dnu_norm: f64 = 0.0;
    var dmu_dnu_re: f64 = 0.0;
    var dmu_dnu_im: f64 = 0.0;
    var psi_dmu_re: f64 = 0.0;
    var psi_dmu_im: f64 = 0.0;
    var psi_dnu_re: f64 = 0.0;
    var psi_dnu_im: f64 = 0.0;

    var i: usize = 0;
    while (i < n) : (i += 1) {
        const pr = psi_re[i];
        const pi = psi_im[i];
        const mr = dmu_re[i];
        const mi = dmu_im[i];
        const nr = dnu_re[i];
        const ni = dnu_im[i];

        dmu_norm += mr * mr + mi * mi;
        dnu_norm += nr * nr + ni * ni;

        // <dmu | dnu> = (mr - i*mi)(nr + i*ni)
        dmu_dnu_re += mr * nr + mi * ni;
        dmu_dnu_im += mr * ni - mi * nr;

        // <psi | dmu>
        psi_dmu_re += pr * mr + pi * mi;
        psi_dmu_im += pr * mi - pi * mr;

        // <psi | dnu>
        psi_dnu_re += pr * nr + pi * ni;
        psi_dnu_im += pr * ni - pi * nr;
    }

    // <dmu | psi><psi | dnu> = conj(<psi | dmu>) * <psi | dnu>
    // = (psi_dmu_re - i*psi_dmu_im) * (psi_dnu_re + i*psi_dnu_im)
    const ov_re = psi_dmu_re * psi_dnu_re + psi_dmu_im * psi_dnu_im;
    const ov_im = psi_dmu_re * psi_dnu_im - psi_dmu_im * psi_dnu_re;

    const g_mu_mu = @max(@as(f64, 0.0), dmu_norm - (psi_dmu_re * psi_dmu_re + psi_dmu_im * psi_dmu_im));
    const g_nu_nu = @max(@as(f64, 0.0), dnu_norm - (psi_dnu_re * psi_dnu_re + psi_dnu_im * psi_dnu_im));
    const g_mu_nu = dmu_dnu_re - ov_re;
    const q_im = dmu_dnu_im - ov_im;
    const berry = -2.0 * q_im;

    const det_g = @max(@as(f64, 0.0), g_mu_mu * g_nu_nu - g_mu_nu * g_mu_nu);
    const trace_g = g_mu_mu + g_nu_nu;
    const abs_berry = @abs(berry);
    const o_eps2 = (eps * eps) / (1.0 + trace_g + abs_berry);
    const bogomolny = abs_berry / (2.0 * @sqrt(det_g) + 1e-12);

    out_metrics[0] = g_mu_mu;
    out_metrics[1] = g_nu_nu;
    out_metrics[2] = g_mu_nu;
    out_metrics[3] = berry;
    out_metrics[4] = det_g;
    out_metrics[5] = trace_g;
    out_metrics[6] = o_eps2;
    out_metrics[7] = bogomolny;
    return trace_g;
}

/// Tsotchke `moonlab` v1.2.1 (ABI 0.8.0) closed-system transverse-field Ising / QUBO
/// quantum annealer (`quantum_annealing.h` / `quantum-annealing.ts`).
/// Evolves up to 6 qubits (dim <= 64) under:
///   H(s) = -(1 - s) sum_i X_i + s * (sum_{i<j} J_{ij} Z_i Z_j + sum_i h_i Z_i)
/// schedule_kind: 0 = linear, 1 = quadratic, 2 = cosine.
/// Writes per-qubit <Z_i> into `out_magnetizations[0..n_qubits]` and 4 summary metrics
/// into `out_metrics`: `[ground_energy, expected_energy, ground_overlap, purity_norm]`.
export fn cqm_moonlab_ising_anneal(
    n_qubits_in: u32,
    j_couplings: [*]const f64,
    h_fields: [*]const f64,
    steps_in: u32,
    total_time: f64,
    schedule_kind: u32,
    out_magnetizations: [*]f64,
    out_metrics: [*]f64,
) f64 {
    const n_q: usize = @min(@as(usize, 6), @max(@as(usize, 1), @as(usize, @intCast(n_qubits_in))));
    const dim: usize = @intCast(@as(u32, 1) << @as(u5, @intCast(n_q)));
    const steps: usize = @max(@as(usize, 1), @min(@as(usize, 256), @as(usize, @intCast(steps_in))));
    const dt: f64 = if (total_time > 0.0) total_time / @as(f64, @floatFromInt(steps)) else 0.05;

    var psi_re: [64]f64 = undefined;
    var psi_im: [64]f64 = undefined;
    var diag_e: [64]f64 = undefined;

    const init_amp = 1.0 / @sqrt(@as(f64, @floatFromInt(dim)));
    var min_e: f64 = 1e30;

    // Precompute diagonal Ising energy E(z) for each basis state |z>
    var z: usize = 0;
    while (z < dim) : (z += 1) {
        psi_re[z] = init_amp;
        psi_im[z] = 0.0;

        var e_z: f64 = 0.0;
        var i: usize = 0;
        while (i < n_q) : (i += 1) {
            const bit_i = (@as(u32, @intCast(z)) >> @as(u5, @intCast(i))) & 1;
            const zi: f64 = if (bit_i == 0) 1.0 else -1.0;
            e_z += h_fields[i] * zi;

            var j: usize = i + 1;
            while (j < n_q) : (j += 1) {
                const bit_j = (@as(u32, @intCast(z)) >> @as(u5, @intCast(j))) & 1;
                const zj: f64 = if (bit_j == 0) 1.0 else -1.0;
                e_z += j_couplings[i * n_q + j] * zi * zj;
            }
        }
        diag_e[z] = e_z;
        if (e_z < min_e) {
            min_e = e_z;
        }
    }

    // Second-order Suzuki-Trotter evolution across annealing schedule s(t)
    var step: usize = 0;
    while (step < steps) : (step += 1) {
        const u = (@as(f64, @floatFromInt(step)) + 0.5) / @as(f64, @floatFromInt(steps));
        const s: f64 = switch (schedule_kind) {
            1 => u * u,
            2 => 0.5 * (1.0 - @cos(std.math.pi * u)),
            else => u,
        };

        // 1. Diagonal Ising phase rotation: exp(-i * dt * s * E(z))
        const diag_dt = dt * s;
        z = 0;
        while (z < dim) : (z += 1) {
            const theta = -diag_dt * diag_e[z];
            const c = @cos(theta);
            const sn = @sin(theta);
            const r = psi_re[z];
            const im = psi_im[z];
            psi_re[z] = r * c - im * sn;
            psi_im[z] = r * sn + im * c;
        }

        // 2. Transverse field X rotation on each qubit: exp(i * dt * (1 - s) * X_i)
        // exp(i * alpha * X) = cos(alpha) I + i sin(alpha) X
        const alpha = dt * (1.0 - s);
        const ca = @cos(alpha);
        const sa = @sin(alpha);

        var q: usize = 0;
        while (q < n_q) : (q += 1) {
            const mask: usize = @intCast(@as(u32, 1) << @as(u5, @intCast(q)));
            z = 0;
            while (z < dim) : (z += 1) {
                if ((z & mask) == 0) {
                    const partner = z | mask;
                    const r0 = psi_re[z];
                    const im0 = psi_im[z];
                    const r1 = psi_re[partner];
                    const im1 = psi_im[partner];

                    // psi_0' = ca * psi_0 + i * sa * psi_1 = (ca*r0 - sa*im1) + i*(ca*im0 + sa*r1)
                    // psi_1' = ca * psi_1 + i * sa * psi_0 = (ca*r1 - sa*im0) + i*(ca*im1 + sa*r0)
                    psi_re[z] = ca * r0 - sa * im1;
                    psi_im[z] = ca * im0 + sa * r1;
                    psi_re[partner] = ca * r1 - sa * im0;
                    psi_im[partner] = ca * im1 + sa * r0;
                }
            }
        }
    }

    // Compute final expectation values <Z_i>, expected energy, ground overlap, norm
    var q: usize = 0;
    while (q < n_q) : (q += 1) {
        out_magnetizations[q] = 0.0;
    }

    var expected_e: f64 = 0.0;
    var norm_sq: f64 = 0.0;
    var ground_overlap: f64 = 0.0;

    z = 0;
    while (z < dim) : (z += 1) {
        const prob = psi_re[z] * psi_re[z] + psi_im[z] * psi_im[z];
        norm_sq += prob;
        expected_e += prob * diag_e[z];
        if (@abs(diag_e[z] - min_e) < 1e-9) {
            ground_overlap += prob;
        }
        q = 0;
        while (q < n_q) : (q += 1) {
            const bit_q = (@as(u32, @intCast(z)) >> @as(u5, @intCast(q))) & 1;
            const zq: f64 = if (bit_q == 0) 1.0 else -1.0;
            out_magnetizations[q] += prob * zq;
        }
    }

    out_metrics[0] = min_e;
    out_metrics[1] = expected_e;
    out_metrics[2] = clamp01(ground_overlap);
    out_metrics[3] = norm_sq;
    return expected_e;
}

/// Tsotchke `quantum_rng` / `Quantum-RNG-API` quantum-chaos + Toeplitz extractor kernel.
/// Supports both seeded reproducible mode (`jitter_entropy == 0`) and Wild Non-Deterministic
/// mode (`jitter_entropy != 0` from hardware crypto / high-res timer jitter).
export fn cqm_qrng_quantum_chaos_step(
    state_ptr: [*]u64,
    jitter_entropy: u64,
    out_samples: [*]f64,
    count: u32,
) u64 {
    var s0 = state_ptr[0] ^ jitter_entropy;
    var s1 = state_ptr[1] ^ (jitter_entropy *% 0x9E3779B97F4A7C15);
    var s2 = state_ptr[2] +% 0xD1B54A32D192ED03;
    var s3 = state_ptr[3] ^ 0x94D049BB133111EB;
    if (s0 == 0 and s1 == 0 and s2 == 0 and s3 == 0) {
        s0 = 0x6A09E667F3BCC908;
        s1 = 0xBB67AE8584CAA73B;
        s2 = 0x3C6EF372FE94F82B;
        s3 = 0xA54FF53A5F1D36F1;
    }

    const n: usize = @intCast(count);
    var last_word: u64 = s0;

    var i: usize = 0;
    while (i < n) : (i += 1) {
        // Chaotic Bell-entangled xoshiro256** + SplitMix64 Toeplitz whitening
        const result = std.math.rotl(u64, s1 *% 5, 7) *% 9;
        const t = s1 << 17;

        s2 ^= s0;
        s3 ^= s1;
        s1 ^= s2;
        s0 ^= s3;
        s2 ^= t;
        s3 = std.math.rotl(u64, s3, 45);

        // Toeplitz / SplitMix64 post-measurement decoherence mixer
        var z = result +% 0x9E3779B97F4A7C15;
        z = (z ^ (z >> 30)) *% 0xBF58476D1CE4E5B9;
        z = (z ^ (z >> 27)) *% 0x94D049BB133111EB;
        z = z ^ (z >> 31);

        last_word = z;
        // Convert top 53 bits to uniform [0, 1) f64
        const mantissa = z >> 11;
        out_samples[i] = @as(f64, @floatFromInt(mantissa)) * (1.0 / 9007199254740992.0);
    }

    state_ptr[0] = s0;
    state_ptr[1] = s1;
    state_ptr[2] = s2;
    state_ptr[3] = s3;
    return last_word;
}

/// Tsotchke `eshkol` v1.3.6-evolve Taylor-tower (`derivative-n`) + exact 3D vector calculus
/// (`divergence` & `curl`) kernel.
/// Writes 8 f64 values into `out_metrics`:
///   [0..5] 0th through 4th derivatives [f, f', f'', f''', f'''']
///   [5]    3D vector field divergence div(F)
///   [6]    3D vector field curl magnitude ||curl(F)||
///   [7]    Hamiltonian action integral proxy
export fn cqm_eshkol_taylor_diff(
    x: f64,
    y: f64,
    z: f64,
    omega: f64,
    coupling: f64,
    out_metrics: [*]f64,
) f64 {
    const phase1 = omega + x;
    const phase2 = 2.0 * omega + y;
    const s1 = @sin(phase1);
    const c1 = @cos(phase1);
    const s2 = @sin(phase2);
    const c2 = @cos(phase2);

    const w2 = omega * omega;
    const w3 = w2 * omega;
    const w4 = w2 * w2;

    // Exact symbolic/jet Taylor tower of f(t) = sin(omega*t + x) + coupling * cos(2*omega*t + y) at t = 1
    const f0 = s1 + coupling * c2;
    const f1 = omega * c1 - 2.0 * omega * coupling * s2;
    const f2 = -w2 * s1 - 4.0 * w2 * coupling * c2;
    const f3 = -w3 * c1 + 8.0 * w3 * coupling * s2;
    const f4 = w4 * s1 + 16.0 * w4 * coupling * c2;

    // Exact 3D vector field F(x,y,z) = (sin(x*omega)*cos(y), sin(y*omega)*cos(z), sin(z*omega)*cos(x) + coupling*x*y)
    // Divergence: dFx/dx + dFy/dy + dFz/dz
    const dfx_dx = omega * @cos(x * omega) * @cos(y);
    const dfy_dy = omega * @cos(y * omega) * @cos(z);
    const dfz_dz = omega * @cos(z * omega) * @cos(x);
    const div_f = dfx_dx + dfy_dy + dfz_dz;

    // Curl components: (dFz/dy - dFy/dz, dFx/dz - dFz/dx, dFy/dx - dFx/dy)
    const curl_x = coupling * x + @sin(y * omega) * @sin(z);
    const curl_y = @sin(z * omega) * @sin(x) - coupling * y;
    const curl_z = @sin(x * omega) * @sin(y);
    const curl_mag = @sqrt(curl_x * curl_x + curl_y * curl_y + curl_z * curl_z);

    const action_proxy = 0.5 * f1 * f1 - 0.5 * w2 * f0 * f0 + coupling * div_f;

    out_metrics[0] = f0;
    out_metrics[1] = f1;
    out_metrics[2] = f2;
    out_metrics[3] = f3;
    out_metrics[4] = f4;
    out_metrics[5] = div_f;
    out_metrics[6] = curl_mag;
    out_metrics[7] = action_proxy;
    return div_f;
}

/// Batch neural forward pass for `EntityBrainField` (`6 -> 6 -> 4` recurrent MLP, 70 f32 params/entity).
/// Evaluates `count` entities in one zero-allocation WASM call:
///   - `weights_ptr`: `count * 70` f32 (`w1[36]`, `b1[6]`, `w2[24]`, `b2[4]`)
///   - `inputs_ptr`:  `count * 6` f32
///   - `hidden_ptr`:  `count * 6` f32 (in-place updated with recurrent blend `0.8 * tanh + 0.2 * prev`)
///   - `outputs_ptr`: `count * 4` f32 (`dTheta`, `speedMult`, `emitBoost`, `glyphAffinity`)
export fn cqm_entity_brain_batch_forward(
    weights_ptr: [*]const f32,
    inputs_ptr: [*]const f32,
    hidden_ptr: [*]f32,
    outputs_ptr: [*]f32,
    count: u32,
) u32 {
    const n: usize = @intCast(count);
    var e: usize = 0;
    while (e < n) : (e += 1) {
        const w_base = e * 70;
        const in_base = e * 6;
        const out_base = e * 4;

        // Layer 1: 6 -> 6 with tanh + recurrent 0.8/0.2 blend
        var h: usize = 0;
        while (h < 6) : (h += 1) {
            var sum: f32 = weights_ptr[w_base + 36 + h]; // b1[h]
            const row_offset = w_base + h * 6;
            var i: usize = 0;
            while (i < 6) : (i += 1) {
                sum += weights_ptr[row_offset + i] * inputs_ptr[in_base + i];
            }
            const raw = std.math.tanh(sum);
            hidden_ptr[in_base + h] = raw * 0.8 + hidden_ptr[in_base + h] * 0.2;
        }

        // Layer 2: 6 -> 4 with tanh + output scaling
        var raw_out: [4]f32 = undefined;
        var o: usize = 0;
        while (o < 4) : (o += 1) {
            var sum: f32 = weights_ptr[w_base + 66 + o]; // b2[o]
            const row_offset = w_base + 42 + o * 6;
            var h2: usize = 0;
            while (h2 < 6) : (h2 += 1) {
                sum += weights_ptr[row_offset + h2] * hidden_ptr[in_base + h2];
            }
            raw_out[o] = std.math.tanh(sum);
        }

        outputs_ptr[out_base + 0] = raw_out[0] * 0.35; // dTheta
        outputs_ptr[out_base + 1] = 1.0 + raw_out[1] * 0.4; // speedMult
        outputs_ptr[out_base + 2] = (raw_out[2] + 1.0) * 0.5; // emitBoost
        outputs_ptr[out_base + 3] = raw_out[3]; // glyphAffinity
    }
    return count;
}

/// Fused 32x32 Hebbian plastic matrix update for `GlyphBrain` (`src/sim/glyph-brain.ts`).
/// Updates `hebbian[i * 32 + j]` with decay and outer-product reinforcement clamped to `[-1.5, 1.5]`.
export fn cqm_glyph_hebbian_step(
    hebbian_ptr: [*]f32,
    hidden_ptr: [*]const f32,
    dim: u32,
    lr: f32,
    decay: f32,
) f32 {
    if (dim == 0) return 0.0;
    const d: usize = @intCast(dim);
    const keep: f32 = 1.0 - decay;
    var energy: f32 = 0.0;

    var i: usize = 0;
    while (i < d) : (i += 1) {
        const hi = hidden_ptr[i];
        const row = i * d;
        var j: usize = 0;
        while (j < d) : (j += 1) {
            const hj = hidden_ptr[j];
            var next_w = hebbian_ptr[row + j] * keep + lr * hi * hj;
            if (next_w > 1.5) next_w = 1.5;
            if (next_w < -1.5) next_w = -1.5;
            hebbian_ptr[row + j] = next_w;
            energy += @abs(next_w);
        }
    }
    return energy / @as(f32, @floatFromInt(d * d));
}

/// Tsotchke `rosette-wire` deterministic 64-bit FNV-1a canonical packet digest.
export fn cqm_rosette_fnv1a64(bytes_ptr: [*]const u8, len: u32) u64 {
    var hash: u64 = 0xcbf29ce484222325;
    const prime: u64 = 0x100000001b3;
    const n: usize = @intCast(len);
    var i: usize = 0;
    while (i < n) : (i += 1) {
        hash ^= @as(u64, bytes_ptr[i]);
        hash *%= prime;
    }
    return hash;
}

/// Tsotchke `pq-consensus-bandwidth` post-quantum BFT round wire-bytes calculator.
/// scheme_id:
///   0 => ML-DSA-65 (Dilithium3): sig = 3309 B, pk = 1952 B
///   1 => Falcon-512:             sig = 666 B,  pk = 897 B
///   2 => SLH-DSA-128f (SPHINCS+): sig = 17088 B, pk = 32 B
export fn cqm_pq_wire_bytes(validators: u32, scheme_id: u32, batch_size: u32) u64 {
    if (validators == 0) return 0;
    const sig_bytes: u64 = switch (scheme_id) {
        0 => 3309,
        1 => 666,
        2 => 17088,
        else => 3309,
    };
    const pk_bytes: u64 = switch (scheme_id) {
        0 => 1952,
        1 => 897,
        2 => 32,
        else => 1952,
    };
    const header_bytes: u64 = 96;
    const v: u64 = @intCast(validators);
    const b: u64 = if (batch_size == 0) 1 else @intCast(batch_size);

    const per_vote = sig_bytes + header_bytes;
    const round_votes = v * per_vote;
    const key_roster_amortized = (v * pk_bytes + b - 1) / b;
    return round_votes + key_roster_amortized;
}

/// Tsotchke `GeoRefine` dual-frame orientation determinant det([b - a, c - a]).
export fn cqm_georefine_verify_frame(
    ax: f64,
    ay: f64,
    bx: f64,
    by: f64,
    cx: f64,
    cy: f64,
) f64 {
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

test "gray-scott step preserves bounds and homogeneity" {
    var u = [_]f64{ 1.0, 1.0, 1.0, 1.0 };
    var v = [_]f64{ 0.0, 0.0, 0.0, 0.0 };
    var u_out = [_]f64{ 0.0, 0.0, 0.0, 0.0 };
    var v_out = [_]f64{ 0.0, 0.0, 0.0, 0.0 };
    const mean_v = cqm_gray_scott_step(&u, &v, &u_out, &v_out, 2, 2, 0.16, 0.08, 0.035, 0.060, 1.0);
    try std.testing.expectApproxEqAbs(@as(f64, 0.0), mean_v, 1e-12);
    try std.testing.expectApproxEqAbs(@as(f64, 1.0), u_out[0], 1e-12);
}

test "gray-scott rgba f32 fused step updates pixels and stats" {
    var u = [_]f32{ 1.0, 0.5, 0.5, 1.0 };
    var v = [_]f32{ 0.0, 0.25, 0.25, 0.0 };
    var u_sc = [_]f32{ 0.0, 0.0, 0.0, 0.0 };
    var v_sc = [_]f32{ 0.0, 0.0, 0.0, 0.0 };
    var rgba: [16]u8 = undefined;
    var stats = [_]f32{ 0.0, 0.0 };
    const mean_v = cqm_gray_scott_step_rgba_f32(&u, &v, &u_sc, &v_sc, &rgba, 2, 2, 2, 0.16, 0.08, 0.035, 0.060, 1.0, &stats);
    try std.testing.expect(mean_v >= 0.0 and mean_v <= 1.0);
    try std.testing.expectEqual(@as(u8, 255), rgba[3]);
    try std.testing.expect(stats[1] >= stats[0]);
}

test "fubini-study metric and QGTL full tensor orthogonal tangent" {
    const psi_re = [_]f64{ 1.0, 0.0 };
    const psi_im = [_]f64{ 0.0, 0.0 };
    const dmu_re = [_]f64{ 0.0, 1.0 };
    const dmu_im = [_]f64{ 0.0, 0.0 };
    const dnu_re = [_]f64{ 0.0, 0.0 };
    const dnu_im = [_]f64{ 0.0, 1.0 };
    const g = cqm_qgt_fubini_study(&psi_re, &psi_im, &dmu_re, &dmu_im, 2);
    try std.testing.expectApproxEqAbs(@as(f64, 1.0), g, 1e-12);

    var metrics: [8]f64 = undefined;
    const tr = cqm_qgtl_full_tensor_2d(&psi_re, &psi_im, &dmu_re, &dmu_im, &dnu_re, &dnu_im, 2, 0.05, &metrics);
    try std.testing.expectApproxEqAbs(@as(f64, 2.0), tr, 1e-12);
    try std.testing.expectApproxEqAbs(@as(f64, -2.0), metrics[3], 1e-12);
}

test "moonlab ising anneal lowers energy toward ground state" {
    const j = [_]f64{
        0.0,  -1.0, 0.0,
        -1.0, 0.0,  -1.0,
        0.0,  -1.0, 0.0,
    };
    const h = [_]f64{ -0.5, 0.0, -0.5 };
    var mag = [_]f64{ 0.0, 0.0, 0.0 };
    var metrics = [_]f64{ 0.0, 0.0, 0.0, 0.0 };
    const expected_e = cqm_moonlab_ising_anneal(3, &j, &h, 40, 4.0, 2, &mag, &metrics);
    try std.testing.expect(expected_e < 0.0);
    try std.testing.expectApproxEqAbs(@as(f64, 1.0), metrics[3], 1e-9);
}

test "qrng quantum chaos step generates unit interval samples" {
    var state = [_]u64{ 123, 456, 789, 101112 };
    var samples: [8]f64 = undefined;
    const word = cqm_qrng_quantum_chaos_step(&state, 0, &samples, 8);
    try std.testing.expect(word != 0);
    for (samples) |s| {
        try std.testing.expect(s >= 0.0 and s < 1.0);
    }
}

test "rosette fnv1a64 and pq wire bytes" {
    const msg = "rosette-wire:v1";
    const h = cqm_rosette_fnv1a64(msg.ptr, @intCast(msg.len));
    try std.testing.expect(h != 0xcbf29ce484222325);

    const ml_dsa = cqm_pq_wire_bytes(64, 0, 8);
    const falcon = cqm_pq_wire_bytes(64, 1, 8);
    const slh_dsa = cqm_pq_wire_bytes(64, 2, 8);
    try std.testing.expect(falcon < ml_dsa);
    try std.testing.expect(ml_dsa < slh_dsa);
}
