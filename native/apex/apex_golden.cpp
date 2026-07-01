// apex_golden.cpp — prints the APEX golden reproduction vectors for a set of seeds.
//
// Diff this program's output against the TypeScript oracle (which is authoritative, ADR-0007):
//
//   bun -e "import {apexGoldenVectors} from './src/sim/apex-native-backend'; \
//     for (const s of [1,7,12345,0xabcdef]) console.log(s, apexGoldenVectors(s));"
//
// A native APEX backend is CORRECT only when every hash below equals the oracle's for every seed.
// Build:  g++ -std=c++17 -O2 native/apex/apex_golden.cpp -o native/apex/apex_golden   (see README.md)
#include "apex_kernels.hpp"
#include <cstdio>

int main() {
    const uint32_t seeds[] = {1u, 7u, 12345u, 0xabcdefu};
    std::printf("seed        primeSieve   statevector  heatGrid     pendulum\n");
    for (uint32_t s : seeds) {
        std::printf("%-11u %-12u %-12u %-12u %-12u\n",
                    s,
                    apex::prime_sieve_hash(256, s),
                    apex::statevector_hash(6, 8, s),
                    apex::heat_grid_hash(32, 32, 16, s),
                    apex::pendulum_hash(64, 32, s));
    }
    return 0;
}
