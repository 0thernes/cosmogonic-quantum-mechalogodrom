/**
 * Quantization utilities for browser-scale simulation buffers.
 *
 * Two API layers intentionally coexist:
 * - legacy FP32-approx helpers (`fp32ToFp16`, `quantizeFp16InPlace`) preserve
 *   existing call sites that want precision truncation while staying in
 *   `Float32Array`.
 * - packed helpers (`fp32ToFp16Bits`, `quantizeFp16`, `dequantizeFp16Into`)
 *   provide real `Uint16Array` storage and measurable byte reduction.
 */

const F32 = new Float32Array(1);
const U32 = new Uint32Array(F32.buffer);

/**
 * Convert FP32 to a 16-bit IEEE-754 half-float bit pattern.
 *
 * @param value - FP32 value to convert
 * @returns unsigned 16-bit half-float bits
 */
export function fp32ToFp16Bits(value: number): number {
  F32[0] = value;
  const bits = U32[0] ?? 0;
  const sign = (bits >>> 16) & 0x8000;
  const exp = (bits >>> 23) & 0xff;
  const mant = bits & 0x7fffff;

  if (exp === 0xff) {
    return sign | (mant === 0 ? 0x7c00 : 0x7e00);
  }

  let halfExp = exp - 127 + 15;
  if (halfExp >= 0x1f) return sign | 0x7c00;

  if (halfExp <= 0) {
    if (halfExp < -10) return sign;
    const subMant = mant | 0x800000;
    const shift = 14 - halfExp;
    let halfMant = subMant >>> shift;
    const round = (subMant >>> (shift - 1)) & 1;
    halfMant += round;
    return sign | (halfMant & 0x03ff);
  }

  let halfMant = mant >>> 13;
  if ((mant & 0x1000) !== 0) {
    halfMant++;
    if ((halfMant & 0x0400) !== 0) {
      halfMant = 0;
      halfExp++;
      if (halfExp >= 0x1f) return sign | 0x7c00;
    }
  }

  return sign | (halfExp << 10) | (halfMant & 0x03ff);
}

/**
 * Convert a 16-bit IEEE-754 half-float bit pattern back to FP32.
 *
 * @param bits - unsigned 16-bit half-float bits
 * @returns decoded FP32 value
 */
export function fp16BitsToFp32(bits: number): number {
  const half = bits & 0xffff;
  const sign = (half & 0x8000) << 16;
  let exp = (half >>> 10) & 0x1f;
  let mant = half & 0x03ff;

  let out: number;
  if (exp === 0) {
    if (mant === 0) {
      out = sign;
    } else {
      exp = 1;
      while ((mant & 0x0400) === 0) {
        mant <<= 1;
        exp--;
      }
      mant &= 0x03ff;
      out = sign | ((exp + 112) << 23) | (mant << 13);
    }
  } else if (exp === 0x1f) {
    out = sign | 0x7f800000 | (mant << 13);
  } else {
    out = sign | ((exp + 112) << 23) | (mant << 13);
  }

  U32[0] = out >>> 0;
  return F32[0] ?? 0;
}

/**
 * Convert FP32 to a half-rounded FP32 value. This legacy helper does not reduce
 * memory by itself; use {@link quantizeFp16} for packed storage.
 *
 * @param value - FP32 value to convert
 * @returns half-rounded value stored as FP32
 */
export function fp32ToFp16(value: number): number {
  if (value === 0) return 0;
  return fp16BitsToFp32(fp32ToFp16Bits(value));
}

/**
 * Legacy compatibility helper for half-rounded values already stored as FP32.
 *
 * @param value - half-rounded FP32 value
 * @returns unchanged FP32 value
 */
export function fp16ToFp32(value: number): number {
  return value;
}

/**
 * Convert FP32 to INT8 with scaling.
 *
 * @param value - FP32 value to convert
 * @param min - Minimum value in the range
 * @param max - Maximum value in the range
 * @returns INT8 value (0-255)
 */
export function fp32ToInt8(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  const normalized = (clamped - min) / (max - min);
  return Math.round(normalized * 255);
}

/**
 * Convert INT8 back to FP32 with scaling.
 *
 * @param value - INT8 value (0-255)
 * @param min - Minimum value in the range
 * @param max - Maximum value in the range
 * @returns FP32 value
 */
export function int8ToFp32(value: number, min: number, max: number): number {
  if (max <= min) return min;
  const normalized = Math.max(0, Math.min(255, value)) / 255;
  return min + normalized * (max - min);
}

/**
 * Convert FP32 array to half-rounded FP32 values in-place.
 *
 * @param array - Float32Array to convert
 */
export function quantizeFp16InPlace(array: Float32Array): void {
  for (let i = 0; i < array.length; i++) {
    array[i] = fp32ToFp16(array[i] ?? 0);
  }
}

/**
 * Convert FP32 array to packed FP16 storage.
 *
 * @param array - Float32Array to convert
 * @returns Uint16Array containing IEEE-754 half-float bit patterns
 */
export function quantizeFp16(array: Float32Array): Uint16Array {
  const result = new Uint16Array(array.length);
  for (let i = 0; i < array.length; i++) {
    result[i] = fp32ToFp16Bits(array[i] ?? 0);
  }
  return result;
}

/**
 * Convert packed FP16 storage back to FP32.
 *
 * @param array - Uint16Array of half-float bit patterns
 * @returns Float32Array with decoded values
 */
export function dequantizeFp16(array: Uint16Array): Float32Array {
  const result = new Float32Array(array.length);
  return dequantizeFp16Into(array, result);
}

/**
 * Decode a packed FP16 range into a caller-provided scratch buffer.
 *
 * @param array - Uint16Array of half-float bit patterns
 * @param target - Float32Array scratch buffer to fill
 * @param sourceOffset - first packed element to read
 * @param count - number of elements to decode
 * @param targetOffset - first target element to write
 * @returns the provided target buffer
 */
export function dequantizeFp16Into(
  array: Uint16Array,
  target: Float32Array,
  sourceOffset = 0,
  count = array.length - sourceOffset,
  targetOffset = 0,
): Float32Array {
  const safeCount = Math.max(
    0,
    Math.min(count, array.length - sourceOffset, target.length - targetOffset),
  );
  for (let i = 0; i < safeCount; i++) {
    target[targetOffset + i] = fp16BitsToFp32(array[sourceOffset + i] ?? 0);
  }
  return target;
}

/**
 * Convert FP32 array to INT8 array with scaling.
 *
 * @param array - Float32Array to convert
 * @param min - Minimum value in the range
 * @param max - Maximum value in the range
 * @returns Uint8Array with quantized values
 */
export function quantizeInt8(array: Float32Array, min: number, max: number): Uint8Array {
  const result = new Uint8Array(array.length);
  for (let i = 0; i < array.length; i++) {
    result[i] = fp32ToInt8(array[i] ?? 0, min, max);
  }
  return result;
}

/**
 * Convert INT8 array back to FP32 with scaling.
 *
 * @param array - Uint8Array to convert
 * @param min - Minimum value in the range
 * @param max - Maximum value in the range
 * @returns Float32Array with dequantized values
 */
export function dequantizeInt8(array: Uint8Array, min: number, max: number): Float32Array {
  const result = new Float32Array(array.length);
  for (let i = 0; i < array.length; i++) {
    result[i] = int8ToFp32(array[i] ?? 0, min, max);
  }
  return result;
}

/**
 * Decode an INT8 range into a caller-provided scratch buffer.
 *
 * @param array - Uint8Array to convert
 * @param target - Float32Array scratch buffer to fill
 * @param min - Minimum value in the range
 * @param max - Maximum value in the range
 * @param sourceOffset - first packed element to read
 * @param count - number of elements to decode
 * @param targetOffset - first target element to write
 * @returns the provided target buffer
 */
export function dequantizeInt8Into(
  array: Uint8Array,
  target: Float32Array,
  min: number,
  max: number,
  sourceOffset = 0,
  count = array.length - sourceOffset,
  targetOffset = 0,
): Float32Array {
  const safeCount = Math.max(
    0,
    Math.min(count, array.length - sourceOffset, target.length - targetOffset),
  );
  for (let i = 0; i < safeCount; i++) {
    target[targetOffset + i] = int8ToFp32(array[sourceOffset + i] ?? 0, min, max);
  }
  return target;
}

/**
 * Estimate quantization error for a given range.
 *
 * @param min - Minimum value in the range
 * @param max - Maximum value in the range
 * @returns Maximum quantization error
 */
export function estimateQuantizationError(min: number, max: number): number {
  return max > min ? (max - min) / 255 : 0;
}

/**
 * Determine if a value range is suitable for INT8 quantization.
 *
 * @param min - Minimum value in the range
 * @param max - Maximum value in the range
 * @param maxError - Maximum acceptable error
 * @returns True if suitable for INT8 quantization
 */
export function isSuitableForInt8(min: number, max: number, maxError: number = 0.01): boolean {
  return estimateQuantizationError(min, max) <= maxError;
}

/**
 * Get the min and max values in a Float32Array.
 *
 * @param array - Float32Array to analyze
 * @returns [min, max] tuple
 */
export function getRange(array: Float32Array): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < array.length; i++) {
    const val = array[i] ?? 0;
    if (val < min) min = val;
    if (val > max) max = val;
  }
  return [min, max];
}

/**
 * Quality-tier-specific quantization configuration.
 */
export interface QuantizationConfig {
  /** Use FP16 for neural weights */
  useFp16: boolean;
  /** Use INT8 for neural activations/low-tier genome storage */
  useInt8: boolean;
  /** INT8 quantization error threshold */
  int8MaxError: number;
}

/**
 * Get quantization configuration for a quality tier.
 *
 * Quality contract: FP32 genome storage on every tier — no half-precision brain weights.
 * Memory is traded for full neural fidelity; wilderness workers absorb parallel CPU load.
 *
 * @param tier - Quality tier
 * @returns Quantization configuration for the tier
 */
export function getQuantizationConfig(_tier: string): QuantizationConfig {
  return { useFp16: false, useInt8: false, int8MaxError: 0.0 };
}
