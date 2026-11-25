import { describe, expect, it } from 'vitest';
import {
  normalizeRational,
  parseRational,
  rAdd,
  rDiv,
  rEquals,
  rMul,
  rPow,
  rSub,
  rToLatex,
  rToText,
} from '@/src/algorithms/arithmetic/rational';

describe('Số học phân số chính xác (BigInt Rational)', () => {
  it('chuẩn hóa mẫu số dương và rút gọn bằng GCD', () => {
    const a = normalizeRational(2n, 4n);
    expect(rToText(a)).toBe('1/2');
    expect(rToLatex(a)).toBe('\\frac{1}{2}');

    const b = normalizeRational(6n, -9n);
    expect(b.num).toBe(-2n);
    expect(b.den).toBe(3n);
    expect(rToLatex(b)).toBe('-\\frac{2}{3}');

    const z = normalizeRational(0n, -5n);
    expect(z.num).toBe(0n);
    expect(z.den).toBe(1n);
  });

  it('cộng, trừ, nhân, chia phân số giữ nguyên kết quả chính xác', () => {
    const half = parseRational('1/2')!;
    const third = parseRational('1/3')!;
    const sum = rAdd(half, third);
    expect(rToText(sum)).toBe('5/6');
    expect(rToLatex(sum)).toBe('\\frac{5}{6}');

    const diff = rSub(half, third);
    expect(rToText(diff)).toBe('1/6');

    const prod = rMul(parseRational('-3/4')!, parseRational('8/9')!);
    expect(rToText(prod)).toBe('-2/3');

    const quot = rDiv(parseRational('2/3')!, parseRational('-4/5')!);
    expect(rToText(quot)).toBe('-5/6');
  });

  it('phân tích chuỗi số nguyên, thập phân, ký hiệu khoa học và phân số', () => {
    expect(rEquals(parseRational('0.25')!, normalizeRational(1n, 4n))).toBe(true);
    expect(rEquals(parseRational('-0.125')!, normalizeRational(-1n, 8n))).toBe(true);
    expect(rEquals(parseRational('1.5e-2')!, normalizeRational(3n, 200n))).toBe(true);
    expect(rEquals(parseRational('.5')!, normalizeRational(1n, 2n))).toBe(true);
    expect(parseRational('1/0')).toBeNull();
    expect(parseRational('abc')).toBeNull();
  });

  it('lũy thừa nguyên dương, 0 và âm của phân số', () => {
    const base = parseRational('-2/3')!;
    expect(rToText(rPow(base, 0))).toBe('1');
    expect(rToText(rPow(base, 3))).toBe('-8/27');
    expect(rToText(rPow(base, -2))).toBe('9/4');
  });

  it('báo lỗi khi chia cho 0', () => {
    expect(() => rDiv(normalizeRational(1n, 1n), normalizeRational(0n, 1n))).toThrow();
    expect(() => normalizeRational(1n, 0n)).toThrow();
  });
});
