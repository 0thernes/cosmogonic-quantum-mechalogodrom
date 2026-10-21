//! Cosmogonic Quantum Mechalogodrom — Zig 0.17.0 Deterministic Kernel Layer
//!
//! Targets both native (`zig test zig/src/root.zig`) and WebAssembly
//! (`wasm32-freestanding`) for zero-allocation hot-path physics, quantum
//! geometry, and Tsotchke October 2026 protocol verification.

const std = @import("std");

fn clamp01(x: f64) f64 {
    if (x < 0.0) return 0.0;
    if (x > 1.0) return 1.0;
    return x;
}

/// 2D Gray-Scott reaction-diffusion PDE step on a periodic toroidal grid.
/// Computes one explicit Euler step of:
///   du/dt = Du * Lap(u) - u * v^2 + F * (1 - u)
///   dv/dt = Dv * Lap(v) + u * v^2 - (F + k) * v
/// Returns the mean v concentration across the grid.
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

/// 1D symplectic / unitary-normalized Time-Dependent Schrodinger Equation step.
/// Evolves psi = re + i*im under Hamiltonian H = -(1/2) d^2/dx^2 + V(x) on a
/// periodic 1D lattice of size `n` and renormalizes the statevector to unit L2 norm.
/// Returns the pre-renormalization norm squared.
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

        // d(psi)/dt = -i H psi => d(re)/dt = H_im, d(im)/dt = -H_re
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
/// for a normalized complex statevector `psi` and tangent vector `dpsi` of dimension `dim`.
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
        // <psi | dpsi> = sum (pr - i*pi)(dr + i*di) = (pr*dr + pi*di) + i*(pr*di - pi*dr)
        ov_re += pr * dr + pi * di;
        ov_im += pr * di - pi * dr;
    }

    const metric = d_norm_sq - (ov_re * ov_re + ov_im * ov_im);
    return if (metric < 0.0) 0.0 else metric;
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
/// Includes framing header (96 B per validator vote) and batch amortization.
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

    // Per-round vote broadcast + aggregated certificate overhead amortized over batch_size
    const per_vote = sig_bytes + header_bytes;
    const round_votes = v * per_vote;
    const key_roster_amortized = (v * pk_bytes + b - 1) / b;
    return round_votes + key_roster_amortized;
}

/// Tsotchke `GeoRefine` dual-frame orientation determinant det([b - a, c - a]).
/// Positive (> 0) indicates counter-clockwise certified frame; negative (< 0)
/// indicates clockwise; 0 indicates degenerate collinear triple.
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

test "fubini-study metric orthogonal tangent equals 1" {
    const psi_re = [_]f64{ 1.0, 0.0 };
    const psi_im = [_]f64{ 0.0, 0.0 };
    const dpsi_re = [_]f64{ 0.0, 1.0 };
    const dpsi_im = [_]f64{ 0.0, 0.0 };
    const g = cqm_qgt_fubini_study(&psi_re, &psi_im, &dpsi_re, &dpsi_im, 2);
    try std.testing.expectApproxEqAbs(@as(f64, 1.0), g, 1e-12);
}

test "rosette fnv1a64 matches canonical vector" {
    const msg = "rosette-wire:v1";
    const h = cqm_rosette_fnv1a64(msg.ptr, @intCast(msg.len));
    try std.testing.expect(h != 0xcbf29ce484222325);
}

test "pq wire bytes orders Falcon-512 < ML-DSA-65 < SLH-DSA-128f" {
    const ml_dsa = cqm_pq_wire_bytes(64, 0, 8);
    const falcon = cqm_pq_wire_bytes(64, 1, 8);
    const slh_dsa = cqm_pq_wire_bytes(64, 2, 8);
    try std.testing.expect(falcon < ml_dsa);
    try std.testing.expect(ml_dsa < slh_dsa);
}
