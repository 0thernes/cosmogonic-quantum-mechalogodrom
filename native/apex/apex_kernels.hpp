// apex_kernels.hpp — the C/C++ side of the APEX 1-billion-parameter reproduction contract.
//
// ADR-0007 is binding: the native engine is NEVER authoritative. The seeded TypeScript simulation
// (src/sim/apex-native-backend.ts :: ReferenceApexBackend) is the oracle. These kernels exist so a
// native/GPU backend can compute the heavy organ math at the 1B scale the browser cannot — but a
// native kernel is only CORRECT if it reproduces the oracle's golden vectors
// (apexGoldenVectors(seed)) bit-for-bit, at the defined quantisation. If they disagree, the C++ is
// wrong; the oracle wins.
//
// Every function here mirrors the TS ReferenceApexBackend algorithm EXACTLY: the same mulberry32
// stream, the same stencils, the same FNV-1a-over-quantised-floats hash (QUANT = 1e6). Header-only
// to match native/src/physics.h. No external deps. Determinism law: seeded PRNG only, no time/entropy.
//
// Build the golden-vector printer:  see native/apex/README.md
#pragma once
#include <cstdint>
#include <cmath>
#include <vector>

namespace apex {

// ── mulberry32 — bit-identical to src/math/rng.ts ────────────────────────────────────────────────
struct Mulberry32 {
    uint32_t a;
    explicit Mulberry32(uint32_t seed) : a(seed) {}
    double next() {
        a = (a + 0x6D2B79F5u);
        uint32_t t = a;
        t = (t ^ (t >> 15)) * (t | 1u);
        t ^= t + (t ^ (t >> 7)) * (t | 61u);
        return static_cast<double>((t ^ (t >> 14))) / 4294967296.0;
    }
};

// ── FNV-1a over a quantised float — matches apex-native-backend.ts :: fnvFloat ───────────────────
constexpr double QUANT = 1e6;
inline uint32_t fnv_float(uint32_t h, double v) {
    if (!std::isfinite(v)) v = 0.0;
    int32_t qi = static_cast<int32_t>(std::llround(v * QUANT));
    uint32_t q = static_cast<uint32_t>(qi);
    uint32_t x = h ^ (q & 0xffu);
    x = x * 0x01000193u;
    x = x ^ ((q >> 8) & 0xffu);
    x = x * 0x01000193u;
    x = x ^ ((q >> 16) & 0xffu);
    x = x * 0x01000193u;
    x = x ^ ((q >> 24) & 0xffu);
    return x * 0x01000193u;
}

inline bool is_prime(int64_t k) {
    if (k < 2) return false;
    for (int64_t i = 2; i * i <= k; i++)
        if (k % i == 0) return false;
    return true;
}
inline bool is_twin_distance(int64_t d) {
    return is_prime(d) && (is_prime(d - 2) || is_prime(d + 2));
}

// ── Kernel 1: Prime-Sieve Loom — hash of the twin-prime edge set over n nodes. ───────────────────
inline uint32_t prime_sieve_hash(int n, uint32_t seed) {
    int N = n < 2 ? 2 : (n > (1 << 20) ? (1 << 20) : n);
    uint32_t h = 0x811c9dc5u ^ seed;
    for (int d = 1; d < N; d++) h = fnv_float(h, is_twin_distance(d) ? 1.0 : 0.0);
    return h;
}

// ── Kernel 2: Quantum Brain — hash of a q-qubit statevector after `steps` of a fixed circuit. ────
inline uint32_t statevector_hash(int qubits, int steps, uint32_t seed) {
    int q = qubits < 1 ? 1 : (qubits > 12 ? 12 : qubits);
    int dim = 1 << q;
    std::vector<double> re(dim, 0.0), im(dim, 0.0);
    re[0] = 1.0;
    const double s = M_SQRT1_2;
    int S = steps < 1 ? 1 : steps;
    for (int t = 0; t < S; t++) {
        for (int target = 0; target < q; target++) {
            int tm = 1 << target;
            for (int i = 0; i < dim; i++) {
                if ((i & tm) == 0) {
                    int j = i | tm;
                    double ar = re[i], ai = im[i], br = re[j], bi = im[j];
                    re[i] = (ar + br) * s; im[i] = (ai + bi) * s;
                    re[j] = (ar - br) * s; im[j] = (ai - bi) * s;
                }
            }
        }
        double phi = (t + 1) * 0.196349 + (double)(seed % 1000) / 1000.0;
        double c = std::cos(phi), sn = std::sin(phi);
        for (int i = 0; i < dim; i++) {
            double ar = re[i], ai = im[i];
            re[i] = ar * c - ai * sn;
            im[i] = ar * sn + ai * c;
        }
    }
    uint32_t h = 0x811c9dc5u ^ seed;
    for (int i = 0; i < dim; i++) h = fnv_float(h, re[i] * re[i] + im[i] * im[i]);
    return h;
}

// ── Kernel 3: Thermodynamic heat grid — hash after `steps` of 5-point diffusion. ─────────────────
inline uint32_t heat_grid_hash(int w, int h0, int steps, uint32_t seed) {
    int W = w < 2 ? 2 : (w > 256 ? 256 : w);
    int H = h0 < 2 ? 2 : (h0 > 256 ? 256 : h0);
    std::vector<double> grid(W * H), next(W * H);
    Mulberry32 rng(seed == 0 ? 1u : seed);
    for (auto& g : grid) g = rng.next();
    const double k = 0.2;
    int S = steps < 1 ? 1 : steps;
    for (int t = 0; t < S; t++) {
        for (int y = 0; y < H; y++)
            for (int x = 0; x < W; x++) {
                double c = grid[y * W + x];
                double l = grid[y * W + (x > 0 ? x - 1 : x)];
                double r = grid[y * W + (x < W - 1 ? x + 1 : x)];
                double u = grid[(y > 0 ? y - 1 : y) * W + x];
                double dn = grid[(y < H - 1 ? y + 1 : y) * W + x];
                next[y * W + x] = c + k * (l + r + u + dn - 4 * c);
            }
        grid = next;
    }
    uint32_t hh = 0x811c9dc5u ^ seed;
    for (auto v : grid) hh = fnv_float(hh, v);
    return hh;
}

// ── Kernel 4: Pendulum Hive — hash of n kicked rotors (Chirikov standard map) after `steps`. ─────
inline uint32_t pendulum_hash(int n, int steps, uint32_t seed) {
    int N = n < 1 ? 1 : (n > 4096 ? 4096 : n);
    std::vector<double> theta(N), p(N);
    Mulberry32 rng(seed == 0 ? 1u : seed);
    for (int i = 0; i < N; i++) {
        theta[i] = rng.next() * 2 * M_PI;
        p[i] = (rng.next() - 0.5) * 0.1;
    }
    const double K = 2.7;
    int S = steps < 1 ? 1 : steps;
    for (int t = 0; t < S; t++)
        for (int i = 0; i < N; i++) {
            double np = p[i] + K * std::sin(theta[i]);
            p[i] = np;
            theta[i] = std::fmod(theta[i] + np, 2 * M_PI);
        }
    uint32_t h = 0x811c9dc5u ^ seed;
    for (int i = 0; i < N; i++) h = fnv_float(h, theta[i]);
    return h;
}

} // namespace apex
