/**
 * BOUNDED ESHKOL-INSPIRED TAYLOR JETS
 *
 * A jet stores the truncated univariate Taylor series
 *
 *   f(x0 + h) = sum(c[k] * h^k),  c[k] = f^(k)(x0) / k!,  0 <= k <= K.
 *
 * The recurrence structure is inspired by Eshkol's Taylor-tower work at tag
 * `v1.3.2-evolve`, commit `8443ddaeecec579c60ac858348a23cf1912d7a78`.
 * This module is a deterministic, bounded Float64 runtime analogue for the simulation. It is
 * NOT the native Eshkol implementation, does not provide Eshkol's exact rational/bignum
 * semantics, and is not a claim of full Eshkol language compatibility.
 *
 * Every operation writes into a caller-owned output jet and is safe when that output is also an
 * input. Three scratch arrays are allocated once by the constructor; successful operations do
 * not allocate. Add/subtract/evaluation are O(K). General series composition and products are
 * O(K^2); integer exponentiation is O(K^2 log |n|). K is deliberately capped at 8 so this can be
 * used as a small predictive-policy primitive without unbounded work or coefficient growth.
 */

/** Highest supported derivative/order in the runtime analogue. */
export const ESHKOL_TAYLOR_MAX_ORDER = 8;

/**
 * Defensive magnitude ceiling for every stored coefficient and returned scalar.
 *
 * The ceiling is far above simulation-scale values but leaves substantial IEEE-754 headroom for
 * recurrence products. Invalid/non-finite results fail explicitly rather than silently poisoning
 * a later policy decision.
 */
export const ESHKOL_TAYLOR_COEFFICIENT_BOUND = 1e150;

function assertOrder(order: number): void {
  if (!Number.isInteger(order) || order < 0 || order > ESHKOL_TAYLOR_MAX_ORDER) {
    throw new RangeError(`Taylor order must be an integer in [0, ${ESHKOL_TAYLOR_MAX_ORDER}]`);
  }
}

function assertDegree(degree: number, maximum: number, label: string): void {
  if (!Number.isInteger(degree) || degree < 0 || degree > maximum) {
    throw new RangeError(`${label} must be an integer in [0, ${maximum}]`);
  }
}

function assertBounded(value: number, label: string): void {
  if (!Number.isFinite(value) || Math.abs(value) > ESHKOL_TAYLOR_COEFFICIENT_BOUND) {
    throw new RangeError(
      `${label} must be finite with magnitude <= ${ESHKOL_TAYLOR_COEFFICIENT_BOUND}`,
    );
  }
}

function factorial(n: number): number {
  let result = 1;
  for (let k = 2; k <= n; k++) result *= k;
  return result;
}

function fallingFactorial(n: number, count: number): number {
  let result = 1;
  for (let k = 0; k < count; k++) result *= n - k;
  return result;
}

/** Truncated convolution. `out` must not alias `left` or `right`. O(K^2). */
function multiplySeries(
  left: Float64Array,
  right: Float64Array,
  out: Float64Array,
  order: number,
): void {
  out.fill(0);
  for (let n = 0; n <= order; n++) {
    let coefficient = 0;
    for (let k = 0; k <= n; k++) coefficient += left[k]! * right[n - k]!;
    out[n] = coefficient;
  }
}

/** Formal-series inverse. `out` must not alias `source`. O(K^2). */
function reciprocalSeries(source: Float64Array, out: Float64Array, order: number): void {
  const constant = source[0]!;
  if (constant === 0) throw new RangeError('Taylor reciprocal requires a non-zero constant term');

  out.fill(0);
  out[0] = 1 / constant;
  for (let n = 1; n <= order; n++) {
    let coefficient = 0;
    for (let k = 1; k <= n; k++) coefficient += source[k]! * out[n - k]!;
    out[n] = -coefficient / constant;
  }
}

/**
 * A reusable truncated Taylor jet. Methods mutate this instance as the output and return `this`.
 * Inputs must have the same order. Input/output aliasing is supported for every operation.
 */
export class EshkolTaylorJet {
  readonly order: number;

  private readonly coefficients: Float64Array;
  private readonly work0: Float64Array;
  private readonly work1: Float64Array;
  private readonly work2: Float64Array;

  constructor(order: number) {
    assertOrder(order);
    this.order = order;
    const length = order + 1;
    this.coefficients = new Float64Array(length);
    this.work0 = new Float64Array(length);
    this.work1 = new Float64Array(length);
    this.work2 = new Float64Array(length);
  }

  /** Constant coefficient c[0] = f(x0). */
  get value(): number {
    return this.coefficients[0]!;
  }

  /** Read one normalized coefficient c[k] = f^(k)(x0)/k!. */
  coefficient(degree: number): number {
    assertDegree(degree, this.order, 'Taylor coefficient degree');
    return this.coefficients[degree]!;
  }

  /** Copy coefficients into reusable caller-owned storage without allocating. */
  writeCoefficients(target: Float64Array): Float64Array {
    if (target.length < this.coefficients.length) {
      throw new RangeError(
        `Coefficient target requires at least ${this.coefficients.length} slots`,
      );
    }
    target.set(this.coefficients);
    return target;
  }

  /** Set this jet to zero. */
  zero(): this {
    this.coefficients.fill(0);
    return this;
  }

  /** Set this jet to a finite, bounded constant. */
  setConstant(value: number): this {
    assertBounded(value, 'Taylor constant');
    this.coefficients.fill(0);
    this.coefficients[0] = value;
    return this;
  }

  /**
   * Seed the independent variable x = x0 + slope*h. The usual derivative seed is slope=1.
   */
  setVariable(x0: number, slope = 1): this {
    assertBounded(x0, 'Taylor variable value');
    assertBounded(slope, 'Taylor variable slope');
    this.coefficients.fill(0);
    this.coefficients[0] = x0;
    if (this.order >= 1) this.coefficients[1] = slope;
    return this;
  }

  /** Set all c[k] coefficients after validating exact shape and boundedness. */
  setCoefficients(values: ArrayLike<number>): this {
    if (values.length !== this.coefficients.length) {
      throw new RangeError(`Expected ${this.coefficients.length} Taylor coefficients`);
    }
    for (let k = 0; k <= this.order; k++) {
      const value = values[k]!;
      assertBounded(value, `Taylor coefficient c[${k}]`);
      this.work0[k] = value;
    }
    this.coefficients.set(this.work0);
    return this;
  }

  /** Copy another same-order jet into this output. */
  copyFrom(source: EshkolTaylorJet): this {
    this.assertCompatible(source);
    this.coefficients.set(source.coefficients);
    return this;
  }

  /** out = a + b. O(K). */
  add(a: EshkolTaylorJet, b: EshkolTaylorJet): this {
    this.assertCompatible(a, b);
    for (let k = 0; k <= this.order; k++) this.work0[k] = a.coefficients[k]! + b.coefficients[k]!;
    return this.commit(this.work0);
  }

  /** out = a - b. O(K). */
  sub(a: EshkolTaylorJet, b: EshkolTaylorJet): this {
    this.assertCompatible(a, b);
    for (let k = 0; k <= this.order; k++) this.work0[k] = a.coefficients[k]! - b.coefficients[k]!;
    return this.commit(this.work0);
  }

  /** out = a * b via truncated convolution. O(K^2). */
  mul(a: EshkolTaylorJet, b: EshkolTaylorJet): this {
    this.assertCompatible(a, b);
    multiplySeries(a.coefficients, b.coefficients, this.work0, this.order);
    return this.commit(this.work0);
  }

  /** out = 1/a as a formal power series. O(K^2). */
  reciprocal(a: EshkolTaylorJet): this {
    this.assertCompatible(a);
    reciprocalSeries(a.coefficients, this.work0, this.order);
    return this.commit(this.work0);
  }

  /** out = numerator / denominator. O(K^2). */
  div(numerator: EshkolTaylorJet, denominator: EshkolTaylorJet): this {
    this.assertCompatible(numerator, denominator);
    reciprocalSeries(denominator.coefficients, this.work1, this.order);
    multiplySeries(numerator.coefficients, this.work1, this.work0, this.order);
    return this.commit(this.work0);
  }

  /** out = exp(a), using y' = a'y. O(K^2). */
  exp(a: EshkolTaylorJet): this {
    this.assertCompatible(a);
    this.work0.fill(0);
    this.work0[0] = Math.exp(a.coefficients[0]!);
    for (let n = 1; n <= this.order; n++) {
      let coefficient = 0;
      for (let k = 1; k <= n; k++) {
        coefficient += k * a.coefficients[k]! * this.work0[n - k]!;
      }
      this.work0[n] = coefficient / n;
    }
    return this.commit(this.work0);
  }

  /** out = log(a), for a positive real constant term. O(K^2). */
  log(a: EshkolTaylorJet): this {
    this.assertCompatible(a);
    const constant = a.coefficients[0]!;
    if (constant <= 0) {
      throw new RangeError('Taylor log requires a positive constant term for real Float64 output');
    }

    reciprocalSeries(a.coefficients, this.work1, this.order);
    this.work0.fill(0);
    this.work0[0] = Math.log(constant);
    for (let n = 1; n <= this.order; n++) {
      let coefficient = 0;
      for (let k = 0; k < n; k++) {
        coefficient += (k + 1) * a.coefficients[k + 1]! * this.work1[n - 1 - k]!;
      }
      this.work0[n] = coefficient / n;
    }
    return this.commit(this.work0);
  }

  /** out = sin(a), with sin/cos advanced together. O(K^2). */
  sin(a: EshkolTaylorJet): this {
    return this.trig(a, false);
  }

  /** out = cos(a), with sin/cos advanced together. O(K^2). */
  cos(a: EshkolTaylorJet): this {
    return this.trig(a, true);
  }

  /** out = tanh(a), using y' = a'(1-y^2). O(K^2). */
  tanh(a: EshkolTaylorJet): this {
    this.assertCompatible(a);
    this.work0.fill(0); // y = tanh(a)
    this.work1.fill(0); // q = 1 - y^2
    this.work0[0] = Math.tanh(a.coefficients[0]!);
    this.work1[0] = 1 - this.work0[0]! * this.work0[0]!;

    for (let n = 1; n <= this.order; n++) {
      let derivativeProduct = 0;
      for (let k = 0; k < n; k++) {
        derivativeProduct += (k + 1) * a.coefficients[k + 1]! * this.work1[n - 1 - k]!;
      }
      this.work0[n] = derivativeProduct / n;

      let squareCoefficient = 0;
      for (let k = 0; k <= n; k++) {
        squareCoefficient += this.work0[k]! * this.work0[n - k]!;
      }
      this.work1[n] = -squareCoefficient;
    }
    return this.commit(this.work0);
  }

  /**
   * out = a^exponent for a safe integer exponent.
   *
   * Truncated exponentiation by squaring supports a zero constant term for positive powers and
   * uses formal-series inversion for negative powers. O(K^2 log |exponent|).
   */
  powInteger(a: EshkolTaylorJet, exponent: number): this {
    this.assertCompatible(a);
    if (!Number.isSafeInteger(exponent)) {
      throw new RangeError('Taylor integer exponent must be a safe integer');
    }
    if (exponent === 0) return this.setConstant(1);
    if (exponent < 0 && a.coefficients[0] === 0) {
      throw new RangeError('A Taylor series with zero constant term cannot have a negative power');
    }

    let result = this.work0;
    let base = this.work1;
    let spare = this.work2;
    result.fill(0);
    result[0] = 1;
    base.set(a.coefficients);

    let power = Math.abs(exponent);
    while (power > 0) {
      if (power % 2 === 1) {
        multiplySeries(result, base, spare, this.order);
        const previousResult = result;
        result = spare;
        spare = previousResult;
      }
      power = Math.floor(power / 2);
      if (power > 0) {
        multiplySeries(base, base, spare, this.order);
        const previousBase = base;
        base = spare;
        spare = previousBase;
      }
    }

    if (exponent < 0) {
      reciprocalSeries(result, spare, this.order);
      result = spare;
    }
    return this.commit(result);
  }

  /** Evaluate the truncated series at displacement h using Horner's rule. O(K). */
  evaluate(displacement: number): number {
    assertBounded(displacement, 'Taylor evaluation displacement');
    let value = this.coefficients[this.order]!;
    for (let k = this.order - 1; k >= 0; k--) value = value * displacement + this.coefficients[k]!;
    assertBounded(value, 'Taylor evaluation result');
    return value;
  }

  /** Return f^(degree)(x0) = degree! * c[degree]. O(K) only for the tiny factorial. */
  derivative(degree = 1): number {
    assertDegree(degree, ESHKOL_TAYLOR_MAX_ORDER, 'Taylor derivative degree');
    if (degree > this.order) return 0;
    const value = factorial(degree) * this.coefficients[degree]!;
    assertBounded(value, 'Taylor derivative');
    return value;
  }

  /** Evaluate a derivative of the truncated polynomial at displacement h. O(K). */
  evaluateDerivative(displacement: number, degree = 1): number {
    assertBounded(displacement, 'Taylor derivative displacement');
    assertDegree(degree, ESHKOL_TAYLOR_MAX_ORDER, 'Taylor derivative degree');
    if (degree > this.order) return 0;

    let value = this.coefficients[this.order]! * fallingFactorial(this.order, degree);
    for (let k = this.order - 1; k >= degree; k--) {
      value = value * displacement + this.coefficients[k]! * fallingFactorial(k, degree);
    }
    assertBounded(value, 'Taylor derivative evaluation result');
    return value;
  }

  private trig(a: EshkolTaylorJet, cosine: boolean): this {
    this.assertCompatible(a);
    this.work0.fill(0); // sin(a)
    this.work1.fill(0); // cos(a)
    this.work0[0] = Math.sin(a.coefficients[0]!);
    this.work1[0] = Math.cos(a.coefficients[0]!);

    for (let n = 1; n <= this.order; n++) {
      let sineCoefficient = 0;
      let cosineCoefficient = 0;
      for (let k = 1; k <= n; k++) {
        const weightedInput = k * a.coefficients[k]!;
        sineCoefficient += weightedInput * this.work1[n - k]!;
        cosineCoefficient -= weightedInput * this.work0[n - k]!;
      }
      this.work0[n] = sineCoefficient / n;
      this.work1[n] = cosineCoefficient / n;
    }
    return this.commit(cosine ? this.work1 : this.work0);
  }

  private assertCompatible(...inputs: EshkolTaylorJet[]): void {
    for (const input of inputs) {
      if (input.order !== this.order) {
        throw new RangeError(
          `Taylor jet order mismatch: output=${this.order}, input=${input.order}`,
        );
      }
    }
  }

  /** Validate every result before exposing it, then commit without allocating. */
  private commit(source: Float64Array): this {
    for (let k = 0; k <= this.order; k++) {
      assertBounded(source[k]!, `Taylor result c[${k}]`);
    }
    this.coefficients.set(source);
    return this;
  }
}
