/**
 * Quantization performance benchmarks (Phase 1.1).
 *
 * Measures the memory and performance impact of FP16/INT8 quantization
 * on entity brain storage and neural network operations.
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { mulberry32 } from '../src/math/rng';
import { EntityBrainField } from '../src/sim/entity-brain';
import {
  getQuantizationConfig,
  quantizeFp16,
  dequantizeFp16Into,
  quantizeInt8,
  dequantizeInt8Into,
  dequantizeInt8,
} from '../src/math/quantization';
import { GENOME_LEN } from '../src/sim/genome';
import type { Entity } from '../src/types';

function seededFloatArray(length: number, seed: number): Float32Array {
  const rng = mulberry32(seed);
  const array = new Float32Array(length);
  for (let i = 0; i < array.length; i++) array[i] = rng() * 2 - 1;
  return array;
}

group('Quantization Benchmarks', () => {
  group('Memory Impact', () => {
    bench('FP32 brain storage (baseline)', () => {
      const rng = mulberry32(42);
      const config = { useFp16: false, useInt8: false, int8MaxError: 0.01 };
      const field = new EntityBrainField(50000, rng, config);
      do_not_optimize(field.genomeStorageBytes());
    });

    bench('packed FP16 brain storage', () => {
      const rng = mulberry32(42);
      const field = new EntityBrainField(50000, rng, getQuantizationConfig('desktop'));
      do_not_optimize(field.genomeStorageBytes());
    });

    bench('packed INT8 brain storage', () => {
      const rng = mulberry32(42);
      const field = new EntityBrainField(50000, rng, getQuantizationConfig('phone'));
      do_not_optimize(field.genomeStorageBytes());
    });
  });

  group('Neural Forward Pass Performance', () => {
    const ENTITY_COUNT = 50000;
    const ITERATIONS = 100;

    bench('FP32 forward pass (baseline)', () => {
      const rng = mulberry32(42);
      const config = { useFp16: false, useInt8: false, int8MaxError: 0.01 };
      const field = new EntityBrainField(ENTITY_COUNT, rng, config);
      const list = Array.from({ length: ENTITY_COUNT }, () => ({
        userData: {
          vel: { x: 0, y: 0, z: 0 },
          age: 10,
          life: 600,
          ph: 0.5,
          energy: 50,
          isNhi: false,
        },
      })) as unknown as Entity[];

      for (let i = 0; i < ITERATIONS; i++) {
        field.think(list, 5, i / 60);
      }
    });

    bench('FP16 forward pass (quantized)', () => {
      const rng = mulberry32(42);
      const config = { useFp16: true, useInt8: false, int8MaxError: 0.01 };
      const field = new EntityBrainField(ENTITY_COUNT, rng, config);
      const list = Array.from({ length: ENTITY_COUNT }, () => ({
        userData: {
          vel: { x: 0, y: 0, z: 0 },
          age: 10,
          life: 600,
          ph: 0.5,
          energy: 50,
          isNhi: false,
        },
      })) as unknown as Entity[];

      for (let i = 0; i < ITERATIONS; i++) {
        field.think(list, 5, i / 60);
      }
    });
  });

  group('Quantization Conversion Performance', () => {
    const ARRAY_SIZE = 50000 * GENOME_LEN; // 50k entities × 80 genes
    const fp32Fixture = seededFloatArray(ARRAY_SIZE, 20260705);
    const fp16Fixture = quantizeFp16(fp32Fixture);
    const int8Fixture = quantizeInt8(fp32Fixture, -1, 1);
    const fp16Scratch = new Float32Array(ARRAY_SIZE);
    const int8Scratch = new Float32Array(ARRAY_SIZE);

    bench('FP32 to packed FP16 conversion', () => {
      do_not_optimize(quantizeFp16(fp32Fixture));
    });

    bench('packed FP16 to FP32 scratch decode', () => {
      do_not_optimize(dequantizeFp16Into(fp16Fixture, fp16Scratch));
    });

    bench('FP32 to INT8 conversion', () => {
      do_not_optimize(quantizeInt8(fp32Fixture, -1, 1));
    });

    bench('INT8 to FP32 allocation decode', () => {
      do_not_optimize(dequantizeInt8(int8Fixture, -1, 1));
    });

    bench('INT8 to FP32 scratch decode', () => {
      do_not_optimize(dequantizeInt8Into(int8Fixture, int8Scratch, -1, 1));
    });
  });

  group('Quality Tier Configuration', () => {
    bench('Phone tier config lookup', () => {
      for (let i = 0; i < 10000; i++) {
        do_not_optimize(getQuantizationConfig('phone'));
      }
    });

    bench('Desktop tier config lookup', () => {
      for (let i = 0; i < 10000; i++) {
        do_not_optimize(getQuantizationConfig('desktop'));
      }
    });

    bench('Ultra tier config lookup', () => {
      for (let i = 0; i < 10000; i++) {
        do_not_optimize(getQuantizationConfig('ultra'));
      }
    });
  });
});

if (import.meta.main) {
  await run();
}
