import { Rational } from '@/src/types/math';

export function bigintAbs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

export function bigintGcd(a: bigint, b: bigint): bigint {
  let x = bigintAbs(a);
  let y = bigintAbs(b);
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

export function normalizeRational(num: bigint, den: bigint = 1n): Rational {
  if (den === 0n) {
    throw new Error('Mẫu số không thể bằng 0.');
  }
  if (num === 0n) {
    return { num: 0n, den: 1n };
  }
  let n = num;
  let d = den;
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = bigintGcd(n, d);
  return { num: n / g, den: d / g };
}

export const R_ZERO: Rational = { num: 0n, den: 1n };
export const R_ONE: Rational = { num: 1n, den: 1n };
export const R_NEG_ONE: Rational = { num: -1n, den: 1n };

export function rAdd(a: Rational, b: Rational): Rational {
  return normalizeRational(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function rSub(a: Rational, b: Rational): Rational {
  return normalizeRational(a.num * b.den - b.num * a.den, a.den * b.den);
}

export function rMul(a: Rational, b: Rational): Rational {
  if (a.num === 0n || b.num === 0n) return R_ZERO;
  return normalizeRational(a.num * b.num, a.den * b.den);
}

export function rDiv(a: Rational, b: Rational): Rational {
  if (b.num === 0n) {
    throw new Error('Không thể chia cho 0.');
  }
  if (a.num === 0n) return R_ZERO;
  return normalizeRational(a.num * b.den, a.den * b.num);
}

export function rNeg(a: Rational): Rational {
  if (a.num === 0n) return R_ZERO;
  return { num: -a.num, den: a.den };
}

export function rAbs(a: Rational): Rational {
  return { num: bigintAbs(a.num), den: a.den };
}

export function rIsZero(a: Rational): boolean {
  return a.num === 0n;
}

export function rIsOne(a: Rational): boolean {
  return a.num === 1n && a.den === 1n;
}

export function rEquals(a: Rational, b: Rational): boolean {
  return a.num === b.num && a.den === b.den;
}

export function rCompare(a: Rational, b: Rational): number {
  const diff = a.num * b.den - b.num * a.den;
  if (diff < 0n) return -1;
  if (diff > 0n) return 1;
  return 0;
}

export function rPow(base: Rational, exp: number): Rational {
  if (!Number.isInteger(exp)) {
    throw new Error('Số mũ phải là số nguyên.');
  }
  if (exp === 0) return R_ONE;
  if (exp < 0) {
    if (base.num === 0n) {
      throw new Error('Không thể nâng 0 lên lũy thừa âm.');
    }
    return rPow(normalizeRational(base.den, base.num), -exp);
  }
  let res = R_ONE;
  let cur = base;
  let e = exp;
  while (e > 0) {
    if (e % 2 === 1) {
      res = rMul(res, cur);
    }
    e = Math.floor(e / 2);
    if (e > 0) {
      cur = rMul(cur, cur);
    }
  }
  return res;
}

export function rToNumber(a: Rational): number {
  // Convert safely even if BigInt is moderately large
  return Number(a.num) / Number(a.den);
}

export function rToText(a: Rational): string {
  if (a.den === 1n) {
    return a.num.toString();
  }
  return `${a.num.toString()}/${a.den.toString()}`;
}

export function rToLatex(a: Rational): string {
  if (a.den === 1n) {
    return a.num.toString();
  }
  if (a.num < 0n) {
    return `-\\frac{${(-a.num).toString()}}{${a.den.toString()}}`;
  }
  return `\\frac{${a.num.toString()}}{${a.den.toString()}}`;
}

/**
 * Parse integers, decimals, scientific notation, and fractions "p/q" into exact BigInt Rational.
 * Returns null if invalid syntax or zero denominator.
 */
export function parseRational(raw: string): Rational | null {
  const s = raw.trim().replace(/,/g, '.');
  if (!s) return null;

  // Fraction syntax: e.g., -3/4, +5/2
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length !== 2) return null;
    const numStr = parts[0].trim();
    const denStr = parts[1].trim();
    if (!/^[+-]?\d+$/.test(numStr) || !/^[+-]?\d+$/.test(denStr)) {
      return null;
    }
    const den = BigInt(denStr);
    if (den === 0n) return null;
    return normalizeRational(BigInt(numStr), den);
  }

  // Scientific notation or decimal or integer: ^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$
  const match = s.match(/^([+-])?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/);
  if (!match) return null;

  const sign = match[1] === '-' ? -1n : 1n;
  const intPart = match[2] ?? '';
  const fracPart = match[3] ?? match[4] ?? '';
  const expPart = match[5] ? parseInt(match[5], 10) : 0;

  if (!Number.isFinite(expPart) || Math.abs(expPart) > 100) {
    return null;
  }

  const digits = `${intPart}${fracPart}`;
  if (!digits) return null;

  let num = sign * BigInt(digits);
  const netPower10 = expPart - fracPart.length;

  if (netPower10 >= 0) {
    num *= 10n ** BigInt(netPower10);
    return normalizeRational(num, 1n);
  } else {
    const den = 10n ** BigInt(-netPower10);
    return normalizeRational(num, den);
  }
}
