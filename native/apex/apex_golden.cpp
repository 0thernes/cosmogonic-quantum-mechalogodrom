// apex_golden.cpp — prints the APEX golden reproduction vectors for a set of seeds.
//
// Diff this program's output against the TypeScript oracle (which is authoritative, ADR-0007):
//
//   bun -e "import {apexGoldenVectors} from './src/sim/apex-native-backend'; for (const s of
//     [1,7,12345,0xabcdef]) console.log(s, apexGoldenVectors(s));"
//
// A native APEX backend is CORRECT only when every hash below equals the oracle's for every seed.
// Build:  g++ -std=c++20 -O2 -ffp-contract=off -fno-fast-math native/apex/apex_golden.cpp
//             -o native/apex/apex_golden   (use CMake for MSVC; see README.md)
#include "apex_kernels.hpp"
#include <array>
#include <cstdio>

int main() {
    struct GoldenVector {
        uint32_t seed;
        uint32_t prime_sieve;
        uint32_t statevector;
        uint32_t heat_grid;
        uint32_t pendulum;
    };
    // Generated from the authoritative TypeScript oracle. Keeping the expected values in this
    // executable makes CTest a real reproduction gate rather than a printer that always exits zero.
    constexpr std::array<GoldenVector, 4> expected{{
        {1u, 501561741u, 3775563453u, 4144909402u, 3458245023u},
        {7u, 4231112027u, 2458804843u, 3277906024u, 3498515028u},
        {12345u, 3498980949u, 989992069u, 1924624942u, 3314660645u},
        {0xabcdefu, 32012371u, 3235972451u, 3073622485u, 2915688813u},
    }};

    bool reproduced = true;
    std::printf("seed        primeSieve   statevector  heatGrid     pendulum\n");
    for (const auto& golden : expected) {
        const uint32_t s = golden.seed;
        const GoldenVector actual{
            s,
            apex::prime_sieve_hash(256, s),
            apex::statevector_hash(6, 8, s),
            apex::heat_grid_hash(32, 32, 16, s),
            apex::pendulum_hash(64, 32, s),
        };
        std::printf("%-11u %-12u %-12u %-12u %-12u\n",
                    actual.seed,
                    actual.prime_sieve,
                    actual.statevector,
                    actual.heat_grid,
                    actual.pendulum);
        if (actual.prime_sieve != golden.prime_sieve ||
            actual.statevector != golden.statevector ||
            actual.heat_grid != golden.heat_grid ||
            actual.pendulum != golden.pendulum) {
            reproduced = false;
            std::fprintf(stderr, "APEX reproduction mismatch for seed %u\n", s);
        }
    }
    return reproduced ? 0 : 1;
}
