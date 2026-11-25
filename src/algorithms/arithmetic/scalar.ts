import {
  ComputationMode,
  MatrixDisplayData,
  Rational,
  ResolvedComputationMode,
  Scalar,
  StructuredMathError,
} from '@/src/types/math';
import {
  parseRational,
  R_ONE,
  R_ZERO,
  rAbs,
  rAdd,
  rDiv,
  rEquals,
  rIsOne,
  rIsZero,
  rMul,
  rNeg,
  rPow,
  rSub,
  rToLatex,
  rToNumber,
  rToText,
} from './rational';

export const DEFAULT_TOLERANCE = 1e-10;
export const DEFAULT_PRECISION = 4;

export function scalarFromRational(r: Rational): Scalar {
  return { kind: 'rational', value: r };
}

export function scalarFromNumber(n: number): Scalar {
  return { kind: 'number', value: Object.is(n, -0) ? 0 : n };
}

export function scalarZero(mode: ResolvedComputationMode): Scalar {
  return mode === 'exact' ? scalarFromRational(R_ZERO) : scalarFromNumber(0);
}

export function scalarOne(mode: ResolvedComputationMode): Scalar {
  return mode === 'exact' ? scalarFromRational(R_ONE) : scalarFromNumber(1);
}

export function parseScalarToNumber(raw: string): number | null {
  const s = raw.trim().replace(/,/g, '.');
  if (!s) return null;
  if (s.includes('/')) {
    const r = parseRational(s);
    return r ? rToNumber(r) : null;
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) {
    return null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? (Object.is(n, -0) ? 0 : n) : null;
}

export function parseScalar(raw: string, mode: ResolvedComputationMode): Scalar | null {
  if (mode === 'exact') {
    const r = parseRational(raw);
    return r ? scalarFromRational(r) : null;
  }
  const n = parseScalarToNumber(raw);
  return n !== null ? scalarFromNumber(n) : null;
}

export function sToNumber(s: Scalar): number {
  return s.kind === 'rational' ? rToNumber(s.value) : s.value;
}

export function sAdd(a: Scalar, b: Scalar): Scalar {
  if (a.kind === 'rational' && b.kind === 'rational') {
    return scalarFromRational(rAdd(a.value, b.value));
  }
  return scalarFromNumber(sToNumber(a) + sToNumber(b));
}

export function sSub(a: Scalar, b: Scalar): Scalar {
  if (a.kind === 'rational' && b.kind === 'rational') {
    return scalarFromRational(rSub(a.value, b.value));
  }
  return scalarFromNumber(sToNumber(a) - sToNumber(b));
}

export function sMul(a: Scalar, b: Scalar): Scalar {
  if (a.kind === 'rational' && b.kind === 'rational') {
    return scalarFromRational(rMul(a.value, b.value));
  }
  return scalarFromNumber(sToNumber(a) * sToNumber(b));
}

export function sDiv(a: Scalar, b: Scalar): Scalar {
  if (a.kind === 'rational' && b.kind === 'rational') {
    return scalarFromRational(rDiv(a.value, b.value));
  }
  const denom = sToNumber(b);
  if (denom === 0) {
    throw new Error('Không thể chia cho 0.');
  }
  return scalarFromNumber(sToNumber(a) / denom);
}

export function sNeg(a: Scalar): Scalar {
  if (a.kind === 'rational') {
    return scalarFromRational(rNeg(a.value));
  }
  return scalarFromNumber(-a.value);
}

export function sAbs(a: Scalar): Scalar {
  if (a.kind === 'rational') {
    return scalarFromRational(rAbs(a.value));
  }
  return scalarFromNumber(Math.abs(a.value));
}

export function sPow(a: Scalar, exp: number): Scalar {
  if (a.kind === 'rational') {
    return scalarFromRational(rPow(a.value, exp));
  }
  return scalarFromNumber(Math.pow(a.value, exp));
}

export function sIsZero(a: Scalar, tol: number = DEFAULT_TOLERANCE): boolean {
  if (a.kind === 'rational') {
    return rIsZero(a.value);
  }
  return Math.abs(a.value) <= tol;
}

export function sIsOne(a: Scalar, tol: number = DEFAULT_TOLERANCE): boolean {
  if (a.kind === 'rational') {
    return rIsOne(a.value);
  }
  return Math.abs(a.value - 1) <= tol;
}

export function sIsNegative(a: Scalar, tol: number = DEFAULT_TOLERANCE): boolean {
  if (a.kind === 'rational') {
    return a.value.num < 0n;
  }
  return a.value < -tol;
}

export function sEquals(a: Scalar, b: Scalar, tol: number = DEFAULT_TOLERANCE): boolean {
  if (a.kind === 'rational' && b.kind === 'rational') {
    return rEquals(a.value, b.value);
  }
  return Math.abs(sToNumber(a) - sToNumber(b)) <= tol;
}

export function formatNumberClean(value: number, precision: number = DEFAULT_PRECISION, tol: number = DEFAULT_TOLERANCE): string {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) <= tol) return '0';
  const rounded = Number(value.toFixed(precision));
  if (Math.abs(rounded) <= tol) return '0';
  if (Math.abs(value) >= 1e9 || (Math.abs(value) > 0 && Math.abs(value) < Math.pow(10, -Math.max(4, precision)))) {
    return value.toExponential(Math.min(precision, 4));
  }
  return String(rounded);
}

export function sToText(a: Scalar, precision: number = DEFAULT_PRECISION, tol: number = DEFAULT_TOLERANCE): string {
  if (a.kind === 'rational') {
    return rToText(a.value);
  }
  return formatNumberClean(a.value, precision, tol);
}

export function sToLatex(a: Scalar, precision: number = DEFAULT_PRECISION, tol: number = DEFAULT_TOLERANCE): string {
  if (a.kind === 'rational') {
    return rToLatex(a.value);
  }
  return formatNumberClean(a.value, precision, tol);
}

export function formatRowOpFactorLatex(c: Scalar, precision: number = DEFAULT_PRECISION, tol: number = DEFAULT_TOLERANCE): string {
  if (sIsNegative(c, tol)) {
    return `(${sToLatex(c, precision, tol)})`;
  }
  return sToLatex(c, precision, tol);
}

export function resolveComputationMode(
  requested: ComputationMode,
  rawMatrices: string[][][],
  forceNumerical: boolean = false
): ResolvedComputationMode {
  if (forceNumerical || requested === 'numerical') {
    return 'numerical';
  }
  if (requested === 'exact') {
    return 'exact';
  }
  // In 'auto' mode: use exact rational if all entries parse as exact rationals and dimensions are moderate (<= 10)
  for (const m of rawMatrices) {
    if (m.length > 10 || (m[0]?.length ?? 0) > 10) {
      return 'numerical';
    }
    for (const row of m) {
      for (const cell of row) {
        if (!parseRational(cell)) {
          return 'numerical';
        }
      }
    }
  }
  return 'exact';
}

export function parseMatrixRaw(
  raw: string[][],
  matrixName: string,
  mode: ResolvedComputationMode
): { ok: true; matrix: Scalar[][] } | { ok: false; error: StructuredMathError } {
  if (raw.length === 0 || raw[0].length === 0) {
    return {
      ok: false,
      error: {
        code: 'INVALID_DIMENSIONS',
        message: `Ma trận ${matrixName} phải có ít nhất 1 hàng và 1 cột.`,
      },
    };
  }
  const cols = raw[0].length;
  const matrix: Scalar[][] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].length !== cols) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DIMENSIONS',
          message: `Các hàng của ma trận ${matrixName} không có cùng số cột.`,
        },
      };
    }
    const row: Scalar[] = [];
    for (let j = 0; j < cols; j++) {
      const cell = raw[i][j].trim();
      if (!cell) {
        return {
          ok: false,
          error: {
            code: 'EMPTY_CELL',
            message: `Hãy nhập đầy đủ các phần tử của ma trận ${matrixName}.`,
            detail: `Ô tại hàng ${i + 1}, cột ${j + 1} đang để trống.`,
            cell: { matrixName, row: i, col: j },
          },
        };
      }
      const val = parseScalar(cell, mode);
      if (!val) {
        return {
          ok: false,
          error: {
            code: 'INVALID_SCALAR',
            message: `Dữ liệu ma trận ${matrixName} không hợp lệ.`,
            detail: `Giá trị "${cell}" tại hàng ${i + 1}, cột ${j + 1} không phải số hoặc phân số hợp lệ.`,
            cell: { matrixName, row: i, col: j },
          },
        };
      }
      row.push(val);
    }
    matrix.push(row);
  }
  return { ok: true, matrix };
}

export function cloneMatrix(M: Scalar[][]): Scalar[][] {
  return M.map((row) => [...row]);
}

export function createZeroMatrix(rows: number, cols: number, mode: ResolvedComputationMode): Scalar[][] {
  const z = scalarZero(mode);
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => z));
}

export function createIdentityMatrix(n: number, mode: ResolvedComputationMode): Scalar[][] {
  const z = scalarZero(mode);
  const one = scalarOne(mode);
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => (i === j ? one : z))
  );
}

export function matrixToLatex(
  M: Scalar[][],
  precision: number = DEFAULT_PRECISION,
  tol: number = DEFAULT_TOLERANCE,
  augmentedSplitCol?: number
): string {
  const cols = M[0]?.length ?? 0;
  if (augmentedSplitCol !== undefined && augmentedSplitCol > 0 && augmentedSplitCol < cols) {
    const leftSpec = 'c'.repeat(augmentedSplitCol);
    const rightSpec = 'c'.repeat(cols - augmentedSplitCol);
    const rowsLatex = M.map((row) => row.map((v) => sToLatex(v, precision, tol)).join(' & ')).join(' \\\\ ');
    return `\\left[\\begin{array}{${leftSpec}|${rightSpec}} ${rowsLatex} \\end{array}\\right]`;
  }
  const rowsLatex = M.map((row) => row.map((v) => sToLatex(v, precision, tol)).join(' & ')).join(' \\\\ ');
  return `\\begin{bmatrix} ${rowsLatex} \\end{bmatrix}`;
}

export function matrixToDisplayData(
  M: Scalar[][],
  precision: number = DEFAULT_PRECISION,
  tol: number = DEFAULT_TOLERANCE,
  augmentedSplitCol?: number
): MatrixDisplayData {
  return {
    rows: M.length,
    cols: M[0]?.length ?? 0,
    entries: M.map((row) => row.map((v) => sToText(v, precision, tol))),
    latex: matrixToLatex(M, precision, tol, augmentedSplitCol),
    augmentedSplitCol,
  };
}

export function vectorToLatex(
  v: Scalar[],
  precision: number = DEFAULT_PRECISION,
  tol: number = DEFAULT_TOLERANCE
): string {
  return `\\begin{bmatrix} ${v.map((x) => sToLatex(x, precision, tol)).join(' \\\\ ')} \\end{bmatrix}`;
}

export function matrixMaxNormDiff(A: Scalar[][], B: Scalar[][]): number {
  let maxDiff = 0;
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A[0].length; j++) {
      const diff = Math.abs(sToNumber(A[i][j]) - sToNumber(B[i][j]));
      if (diff > maxDiff) maxDiff = diff;
    }
  }
  return maxDiff;
}

export function matricesEqual(A: Scalar[][], B: Scalar[][], tol: number = DEFAULT_TOLERANCE): boolean {
  if (A.length !== B.length || (A[0]?.length ?? 0) !== (B[0]?.length ?? 0)) return false;
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A[0].length; j++) {
      if (!sEquals(A[i][j], B[i][j], tol)) return false;
    }
  }
  return true;
}

export function multiplyRawMatrices(A: Scalar[][], B: Scalar[][]): Scalar[][] {
  const m = A.length;
  const n = A[0].length;
  const p = B[0].length;
  const mode: ResolvedComputationMode = A[0][0].kind === 'rational' && B[0][0].kind === 'rational' ? 'exact' : 'numerical';
  const C = createZeroMatrix(m, p, mode);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < p; j++) {
      let sum = scalarZero(mode);
      for (let k = 0; k < n; k++) {
        sum = sAdd(sum, sMul(A[i][k], B[k][j]));
      }
      C[i][j] = sum;
    }
  }
  return C;
}

export function transposeRawMatrix(A: Scalar[][]): Scalar[][] {
  const m = A.length;
  const n = A[0].length;
  return Array.from({ length: n }, (_, i) => Array.from({ length: m }, (__, j) => A[j][i]));
}
