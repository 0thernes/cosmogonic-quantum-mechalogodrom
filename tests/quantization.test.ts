/**
 * Quantization utility tests (Phase 1.1).
 *
 * Tests for FP16/INT8 quantization and dequantization functions.
 * Ensures determinism and correctness of quantization operations.
 */

import { describe, test, expect } from 'bun:test';
import {
  fp32ToFp16Bits,
  fp16BitsToFp32,
  fp32ToFp16,
  fp16ToFp32,
  fp32ToInt8,
  int8ToFp32,
  quantizeFp16,
  dequantizeFp16,
  dequantizeFp16Into,
  quantizeFp16InPlace,
  quantizeInt8,
  dequantizeInt8,
  dequantizeInt8Into,
  estimateQuantizationError,
  isSuitableForInt8,
  getRange,
  getQuantizationConfig,
} from '../src/math/quantization';

describe('Quantization utilities', () => {
  describe('FP16 conversion', () => {
    test('fp32ToFp16 preserves zero', () => {
      expect(fp32ToFp16(0)).toBe(0);
      // JavaScript treats -0 as 0 in most contexts
      expect(fp32ToFp16(-0)).toBe(0);
    });

    test('fp32ToFp16 preserves small values', () => {
      expect(fp32ToFp16(1.0)).toBeCloseTo(1.0, 3);
      expect(fp32ToFp16(-1.0)).toBeCloseTo(-1.0, 3);
      expect(fp32ToFp16(0.5)).toBeCloseTo(0.5, 3);
    });

    test('fp32ToFp16 handles special values', () => {
      expect(fp32ToFp16(Infinity)).toBe(Infinity);
      expect(fp32ToFp16(-Infinity)).toBe(-Infinity);
      expect(Number.isNaN(fp32ToFp16(NaN))).toBe(true);
    });

    test('fp16ToFp32 is a no-op (current implementation)', () => {
      expect(fp16ToFp32(1.0)).toBe(1.0);
      expect(fp16ToFp32(-1.0)).toBe(-1.0);
    });

    test('fp32ToFp16 is deterministic', () => {
      const value = 3.14159;
      const result1 = fp32ToFp16(value);
      const result2 = fp32ToFp16(value);
      expect(result1).toBe(result2);
    });

    test('fp32ToFp16Bits creates real 16-bit packed values', () => {
      const bits = fp32ToFp16Bits(1.5);
      expect(bits).toBe(0x3e00);
      expect(bits).toBeLessThanOrEqual(0xffff);
      expect(fp16BitsToFp32(bits)).toBeCloseTo(1.5, 6);
    });

    test('quantizeFp16 halves storage bytes versus Float32Array', () => {
      const array = new Float32Array([0, 0.25, -0.5, 1]);
      const packed = quantizeFp16(array);
      expect(packed).toBeInstanceOf(Uint16Array);
      expect(packed.length).toBe(array.length);
      expect(packed.byteLength).toBe(array.byteLength / 2);
    });

    test('dequantizeFp16 and dequantizeFp16Into round-trip packed values', () => {
      const original = new Float32Array([0.1, -0.25, 0.5, 1]);
      const packed = quantizeFp16(original);
      const decoded = dequantizeFp16(packed);
      expect(decoded[0]!).toBeCloseTo(original[0]!, 3);
      expect(decoded[1]!).toBeCloseTo(original[1]!, 3);
      const scratch = new Float32Array(2);
      const returned = dequantizeFp16Into(packed, scratch, 1, 2);
      expect(returned).toBe(scratch);
      expect(scratch[0]!).toBeCloseTo(original[1]!, 3);
      expect(scratch[1]!).toBeCloseTo(original[2]!, 3);
    });
  });

  describe('INT8 conversion', () => {
    test('fp32ToInt8 maps range to 0-255', () => {
      expect(fp32ToInt8(0, 0, 1)).toBe(0);
      expect(fp32ToInt8(1, 0, 1)).toBe(255);
      expect(fp32ToInt8(0.5, 0, 1)).toBe(128); // 0.5 * 255 = 127.5, rounds to 128
    });

    test('fp32ToInt8 clamps to range', () => {
      expect(fp32ToInt8(-1, 0, 1)).toBe(0);
      expect(fp32ToInt8(2, 0, 1)).toBe(255);
    });

    test('int8ToFp32 reverses fp32ToInt8', () => {
      const original = 0.5;
      const quantized = fp32ToInt8(original, 0, 1);
      const dequantized = int8ToFp32(quantized, 0, 1);
      expect(dequantized).toBeCloseTo(original, 2); // Allow some quantization error
    });

    test('int8ToFp32 handles edge cases', () => {
      expect(int8ToFp32(0, 0, 1)).toBe(0);
      expect(int8ToFp32(255, 0, 1)).toBe(1);
      expect(int8ToFp32(127, 0, 1)).toBeCloseTo(0.498, 2);
    });

    test('fp32ToInt8 is deterministic', () => {
      const value = 0.7;
      const result1 = fp32ToInt8(value, 0, 1);
      const result2 = fp32ToInt8(value, 0, 1);
      expect(result1).toBe(result2);
    });
  });

  describe('Array quantization', () => {
    test('quantizeFp16InPlace modifies array', () => {
      const array = new Float32Array([1.123456, 2.789012, 3.456789]);
      const original = array.slice();
      quantizeFp16InPlace(array);
      expect(array).not.toEqual(original);
    });

    test('quantizeFp16InPlace is deterministic', () => {
      const array1 = new Float32Array([1.0, 2.0, 3.0]);
      const array2 = new Float32Array([1.0, 2.0, 3.0]);
      quantizeFp16InPlace(array1);
      quantizeFp16InPlace(array2);
      expect(array1).toEqual(array2);
    });

    test('quantizeInt8 creates Uint8Array', () => {
      const array = new Float32Array([0.0, 0.5, 1.0]);
      const quantized = quantizeInt8(array, 0, 1);
      expect(quantized).toBeInstanceOf(Uint8Array);
      expect(quantized.length).toBe(array.length);
    });

    test('quantizeInt8 maps correctly', () => {
      const array = new Float32Array([0.0, 0.5, 1.0]);
      const quantized = quantizeInt8(array, 0, 1);
      expect(quantized[0]).toBe(0);
      expect(quantized[1]).toBe(128); // 0.5 * 255 = 127.5, rounds to 128
      expect(quantized[2]).toBe(255);
    });

    test('dequantizeInt8 reverses quantizeInt8', () => {
      const original = new Float32Array([0.0, 0.5, 1.0]);
      const quantized = quantizeInt8(original, 0, 1);
      const dequantized = dequantizeInt8(quantized, 0, 1);
      expect(dequantized[0]!).toBeCloseTo(original[0]!, 2);
      expect(dequantized[1]!).toBeCloseTo(original[1]!, 2); // Allow quantization error
      expect(dequantized[2]!).toBeCloseTo(original[2]!, 2);
    });

    test('dequantizeInt8Into fills caller-owned scratch', () => {
      const original = new Float32Array([-1, 0, 1]);
      const quantized = quantizeInt8(original, -1, 1);
      const scratch = new Float32Array(2);
      const returned = dequantizeInt8Into(quantized, scratch, -1, 1, 1, 2);
      expect(returned).toBe(scratch);
      expect(scratch[0]!).toBeCloseTo(original[1]!, 2);
      expect(scratch[1]!).toBeCloseTo(original[2]!, 2);
    });

    test('quantizeInt8 is deterministic', () => {
      const array = new Float32Array([0.1, 0.2, 0.3]);
      const quantized1 = quantizeInt8(array, 0, 1);
      const quantized2 = quantizeInt8(array, 0, 1);
      expect(quantized1).toEqual(quantized2);
    });
  });

  describe('Quantization error estimation', () => {
    test('estimateQuantizationError calculates correctly', () => {
      expect(estimateQuantizationError(0, 1)).toBeCloseTo(1 / 255, 5);
      expect(estimateQuantizationError(-1, 1)).toBeCloseTo(2 / 255, 5);
      expect(estimateQuantizationError(0, 10)).toBeCloseTo(10 / 255, 5);
    });

    test('isSuitableForInt8 works correctly', () => {
      expect(isSuitableForInt8(0, 1, 0.01)).toBe(true); // Error ~0.004
      expect(isSuitableForInt8(0, 10, 0.01)).toBe(false); // Error ~0.039
      expect(isSuitableForInt8(0, 0.5, 0.01)).toBe(true); // Error ~0.002
    });
  });

  describe('Range analysis', () => {
    test('getRange finds min and max', () => {
      const array = new Float32Array([1.0, 2.0, 3.0, -1.0]);
      const [min, max] = getRange(array);
      expect(min).toBe(-1.0);
      expect(max).toBe(3.0);
    });

    test('getRange handles single value', () => {
      const array = new Float32Array([5.0]);
      const [min, max] = getRange(array);
      expect(min).toBe(5.0);
      expect(max).toBe(5.0);
    });

    test('getRange handles empty array', () => {
      const array = new Float32Array(0);
      const [min, max] = getRange(array);
      expect(min).toBe(Infinity);
      expect(max).toBe(-Infinity);
    });
  });

  describe('Quality tier configuration', () => {
    test('getQuantizationConfig returns valid config for all tiers', () => {
      const tiers = ['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega'];
      for (const tier of tiers) {
        const config = getQuantizationConfig(tier);
        expect(config).toHaveProperty('useFp16');
        expect(config).toHaveProperty('useInt8');
        expect(config).toHaveProperty('int8MaxError');
        expect(typeof config.useFp16).toBe('boolean');
        expect(typeof config.useInt8).toBe('boolean');
        expect(typeof config.int8MaxError).toBe('number');
      }
    });

    test('high tiers use FP16 config for 50% memory reduction (Phase 1.1 optimization)', () => {
      // High tiers (desktop/ultra/mega) use FP16 for invisible performance gain
      const desktopConfig = getQuantizationConfig('desktop');
      expect(desktopConfig.useFp16).toBe(true);
      expect(desktopConfig.useInt8).toBe(false);
      expect(desktopConfig.int8MaxError).toBe(0.01);

      const ultraConfig = getQuantizationConfig('ultra');
      expect(ultraConfig.useFp16).toBe(true);
      expect(ultraConfig.useInt8).toBe(false);
      expect(ultraConfig.int8MaxError).toBe(0.01);

      const megaConfig = getQuantizationConfig('mega');
      expect(megaConfig.useFp16).toBe(true);
      expect(megaConfig.useInt8).toBe(false);
      expect(megaConfig.int8MaxError).toBe(0.01);
    });

    test('low tiers use FP32 config for full precision', () => {
      // Low tiers (phone/tablet/laptop) use FP32 to maintain quality
      const phoneConfig = getQuantizationConfig('phone');
      expect(phoneConfig.useFp16).toBe(false);
      expect(phoneConfig.useInt8).toBe(false);
      expect(phoneConfig.int8MaxError).toBe(0.0);

      const tabletConfig = getQuantizationConfig('tablet');
      expect(tabletConfig.useFp16).toBe(false);
      expect(tabletConfig.useInt8).toBe(false);
      expect(tabletConfig.int8MaxError).toBe(0.0);

      const laptopConfig = getQuantizationConfig('laptop');
      expect(laptopConfig.useFp16).toBe(false);
      expect(laptopConfig.useInt8).toBe(false);
      expect(laptopConfig.int8MaxError).toBe(0.0);
    });
  });

  describe('Determinism guarantees', () => {
    test('quantization round-trip is deterministic', () => {
      const original = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      const quantized1 = quantizeInt8(original, 0, 1);
      const dequantized1 = dequantizeInt8(quantized1, 0, 1);
      const quantized2 = quantizeInt8(dequantized1, 0, 1);
      const dequantized2 = dequantizeInt8(quantized2, 0, 1);
      expect(quantized1).toEqual(quantized2);
      expect(dequantized1).toEqual(dequantized2);
    });

    test('quantization is seed-independent (pure function)', () => {
      const array = new Float32Array([0.1, 0.2, 0.3]);
      const result1 = quantizeInt8(array, 0, 1);
      const result2 = quantizeInt8(array, 0, 1);
      expect(result1).toEqual(result2);
    });
  });
});
