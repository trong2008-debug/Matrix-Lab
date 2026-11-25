import {
  CalculationReport,
  CalculationStep,
  ComplexNumber,
  EigenPairSummary,
  ResolvedComputationMode,
  Scalar,
} from '@/src/types/math';
import {
  DEFAULT_PRECISION,
  DEFAULT_TOLERANCE,
  formatNumberClean,
  matrixMaxNormDiff,
  matrixToDisplayData,
  matrixToLatex,
  multiplyRawMatrices,
  scalarFromNumber,
  sToNumber,
} from '../arithmetic/scalar';
import { runElimination } from '../elimination/echelon';
import { computeInverseRaw } from '../inverse/inverse';

/**
 * Faddeev–LeVerrier algorithm for characteristic polynomial:
 * det(λI - A) = λ^n + c_1 λ^{n-1} + ... + c_{n-1} λ + c_n
 */
export function characteristicPolynomialCoeffs(A: number[][]): number[] {
  const n = A.length;
  const coeffs: number[] = [1]; // leading coefficient of λ^n
  let B: number[][] = A.map((r) => [...r]);

  for (let k = 1; k <= n; k++) {
    let trace = 0;
    for (let i = 0; i < n; i++) trace += B[i][i];
    const ck = -trace / k;
    coeffs.push(ck);

    if (k < n) {
      // M_k = B + ck * I
      const M: number[][] = B.map((row, i) =>
        row.map((val, j) => (i === j ? val + ck : val))
      );
      // Next B = A * M_k
      const nextB: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          let sum = 0;
          for (let p = 0; p < n; p++) sum += A[i][p] * M[p][j];
          nextB[i][j] = sum;
        }
      }
      B = nextB;
    }
  }
  return coeffs;
}

export function formatCharPolyLatex(coeffs: number[], precision: number, tol: number): string {
  const n = coeffs.length - 1;
  const parts: string[] = [];
  for (let idx = 0; idx < coeffs.length; idx++) {
    const power = n - idx;
    const c = coeffs[idx];
    if (Math.abs(c) <= tol && power !== n) continue;
    const absStr = formatNumberClean(Math.abs(c), precision, tol);
    const isOne = Math.abs(Math.abs(c) - 1) <= tol;
    const varPart = power === 0 ? '' : power === 1 ? '\\lambda' : `\\lambda^{${power}}`;
    const coeffStr = power > 0 && isOne ? '' : absStr;

    if (parts.length === 0) {
      parts.push(`${c < 0 ? '-' : ''}${coeffStr}${varPart}`);
    } else {
      parts.push(`${c < 0 ? ' - ' : ' + '}${coeffStr}${varPart}`);
    }
  }
  return parts.length > 0 ? parts.join('') : '0';
}

/**
 * Reduce real n x n matrix to upper Hessenberg form using Householder reflections.
 */
function toUpperHessenberg(A: number[][]): number[][] {
  const n = A.length;
  const H = A.map((r) => [...r]);

  for (let k = 0; k < n - 2; k++) {
    let normSq = 0;
    for (let i = k + 1; i < n; i++) {
      normSq += H[i][k] * H[i][k];
    }
    const norm = Math.sqrt(normSq);
    if (norm < 1e-14) continue;

    const alpha = H[k + 1][k] >= 0 ? -norm : norm;
    const v = Array(n - k - 1).fill(0);
    v[0] = H[k + 1][k] - alpha;
    for (let i = k + 2; i < n; i++) {
      v[i - k - 1] = H[i][k];
    }

    let vNormSq = 0;
    for (const x of v) vNormSq += x * x;
    if (vNormSq < 1e-28) continue;

    // Left multiply: H[k+1:n, k:n] -= 2 v (v^T H) / vNormSq
    for (let j = k; j < n; j++) {
      let dot = 0;
      for (let i = 0; i < v.length; i++) dot += v[i] * H[k + 1 + i][j];
      const scale = (2 * dot) / vNormSq;
      for (let i = 0; i < v.length; i++) H[k + 1 + i][j] -= scale * v[i];
    }

    // Right multiply: H[0:n, k+1:n] -= 2 (H v) v^T / vNormSq
    for (let i = 0; i < n; i++) {
      let dot = 0;
      for (let j = 0; j < v.length; j++) dot += H[i][k + 1 + j] * v[j];
      const scale = (2 * dot) / vNormSq;
      for (let j = 0; j < v.length; j++) H[i][k + 1 + j] -= scale * v[j];
    }
  }
  return H;
}

/**
 * Givens QR iteration on an m x m matrix with Wilkinson shift.
 */
function qrEigenvalues(A: number[][]): ComplexNumber[] {
  const n = A.length;
  if (n === 0) return [];
  if (n === 1) return [{ re: A[0][0], im: 0 }];
  if (n === 2) {
    const tr = A[0][0] + A[1][1];
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    const disc = tr * tr - 4 * det;
    if (disc >= -1e-12) {
      const s = Math.sqrt(Math.max(0, disc));
      return [
        { re: (tr + s) / 2, im: 0 },
        { re: (tr - s) / 2, im: 0 },
      ];
    }
    const im = Math.sqrt(-disc) / 2;
    return [
      { re: tr / 2, im },
      { re: tr / 2, im: -im },
    ];
  }

  const H = toUpperHessenberg(A);
  const eigenvalues: ComplexNumber[] = [];
  let m = n;
  let iter = 0;
  const maxTotalIter = 250 * n;

  while (m > 0 && iter < maxTotalIter) {
    if (m === 1) {
      eigenvalues.push({ re: H[0][0], im: 0 });
      break;
    }

    // Check deflation at subdiagonal (m-1, m-2)
    const sub = Math.abs(H[m - 1][m - 2]);
    const scale = Math.abs(H[m - 2][m - 2]) + Math.abs(H[m - 1][m - 1]);
    if (sub <= 1e-12 * Math.max(1, scale)) {
      eigenvalues.push({ re: H[m - 1][m - 1], im: 0 });
      m--;
      continue;
    }

    // Check 2x2 block at bottom-right
    if (m === 2 || Math.abs(H[m - 2][m - 3]) <= 1e-12 * (Math.abs(H[m - 3]?.[m - 3] ?? 0) + Math.abs(H[m - 2][m - 2]) + 1)) {
      const a = H[m - 2][m - 2];
      const b = H[m - 2][m - 1];
      const c = H[m - 1][m - 2];
      const d = H[m - 1][m - 1];
      const tr = a + d;
      const det = a * d - b * c;
      const disc = tr * tr - 4 * det;
      if (disc < -1e-12) {
        const im = Math.sqrt(-disc) / 2;
        eigenvalues.push({ re: tr / 2, im }, { re: tr / 2, im: -im });
        m -= 2;
        continue;
      } else if (m === 2) {
        const s = Math.sqrt(Math.max(0, disc));
        eigenvalues.push({ re: (tr + s) / 2, im: 0 }, { re: (tr - s) / 2, im: 0 });
        m -= 2;
        continue;
      }
    }

    // Wilkinson shift from trailing 2x2 submatrix
    const a = H[m - 2][m - 2];
    const b = H[m - 2][m - 1];
    const c = H[m - 1][m - 2];
    const d = H[m - 1][m - 1];
    const tr = a + d;
    const det = a * d - b * c;
    const disc = tr * tr - 4 * det;
    let mu: number;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      const l1 = (tr + s) / 2;
      const l2 = (tr - s) / 2;
      mu = Math.abs(l1 - d) < Math.abs(l2 - d) ? l1 : l2;
    } else {
      // Exceptional shift if eigenvalues of trailing 2x2 are complex to break stagnation
      mu = iter % 15 === 14 ? Math.abs(H[m - 1][m - 2]) + Math.abs(H[m - 2][m - 3] ?? 0) : d;
    }

    // Shifted QR step on H[0:m, 0:m] via Givens rotations
    for (let i = 0; i < m; i++) H[i][i] -= mu;

    const cs: number[] = [];
    const sn: number[] = [];
    for (let k = 0; k < m - 1; k++) {
      const x = H[k][k];
      const y = H[k + 1][k];
      const r = Math.hypot(x, y);
      if (r < 1e-15) {
        cs.push(1);
        sn.push(0);
      } else {
        const cRot = x / r;
        const sRot = y / r;
        cs.push(cRot);
        sn.push(sRot);
        for (let j = k; j < m; j++) {
          const t1 = cRot * H[k][j] + sRot * H[k + 1][j];
          const t2 = -sRot * H[k][j] + cRot * H[k + 1][j];
          H[k][j] = t1;
          H[k + 1][j] = t2;
        }
      }
    }

    // R * Q
    for (let k = 0; k < m - 1; k++) {
      const cRot = cs[k];
      const sRot = sn[k];
      if (sRot === 0 && cRot === 1) continue;
      for (let i = 0; i <= Math.min(k + 1, m - 1); i++) {
        const t1 = cRot * H[i][k] + sRot * H[i][k + 1];
        const t2 = -sRot * H[i][k] + cRot * H[i][k + 1];
        H[i][k] = t1;
        H[i][k + 1] = t2;
      }
    }

    for (let i = 0; i < m; i++) H[i][i] += mu;
    iter++;
  }

  // Fallback if any remaining block didn't fully deflate
  if (eigenvalues.length < n && m > 0) {
    for (let i = 0; i < m; i++) {
      eigenvalues.push({ re: H[i][i], im: 0 });
    }
  }

  return eigenvalues;
}

function groupEigenvalues(raw: ComplexNumber[], tol: number = 1e-6): { value: ComplexNumber; multiplicity: number }[] {
  const groups: { value: ComplexNumber; multiplicity: number }[] = [];
  for (const ev of raw) {
    const cleanRe = Math.abs(ev.re) < tol ? 0 : ev.re;
    const cleanIm = Math.abs(ev.im) < tol ? 0 : ev.im;
    const found = groups.find(
      (g) => Math.abs(g.value.re - cleanRe) < 1e-4 && Math.abs(g.value.im - cleanIm) < 1e-4
    );
    if (found) {
      found.multiplicity++;
    } else {
      groups.push({ value: { re: cleanRe, im: cleanIm }, multiplicity: 1 });
    }
  }
  groups.sort((a, b) => {
    if (Math.abs(a.value.im) < 1e-6 && Math.abs(b.value.im) >= 1e-6) return -1;
    if (Math.abs(a.value.im) >= 1e-6 && Math.abs(b.value.im) < 1e-6) return 1;
    return b.value.re - a.value.re;
  });
  return groups;
}

function formatComplexLatex(z: ComplexNumber, precision: number, tol: number): string {
  const reZero = Math.abs(z.re) <= tol;
  const imZero = Math.abs(z.im) <= tol;
  if (imZero) return formatNumberClean(z.re, precision, tol);
  const imAbs = formatNumberClean(Math.abs(z.im), precision, tol);
  const imPart = imAbs === '1' ? 'i' : `${imAbs}i`;
  if (reZero) return z.im < 0 ? `-${imPart}` : imPart;
  return `${formatNumberClean(z.re, precision, tol)} ${z.im < 0 ? '-' : '+'} ${imPart}`;
}

function formatComplexText(z: ComplexNumber, precision: number, tol: number): string {
  const reZero = Math.abs(z.re) <= tol;
  const imZero = Math.abs(z.im) <= tol;
  if (imZero) return formatNumberClean(z.re, precision, tol);
  const imAbs = formatNumberClean(Math.abs(z.im), precision, tol);
  const imPart = imAbs === '1' ? 'i' : `${imAbs}i`;
  if (reZero) return z.im < 0 ? `-${imPart}` : imPart;
  return `${formatNumberClean(z.re, precision, tol)} ${z.im < 0 ? '-' : '+'} ${imPart}`;
}

function computeRealEigenvectorBasis(
  A: number[][],
  lambda: number,
  expectedMultiplicity: number
): number[][] {
  const n = A.length;
  const shifted: Scalar[][] = A.map((row, i) =>
    row.map((val, j) => scalarFromNumber(i === j ? val - lambda : val))
  );

  // Use a slightly relaxed tolerance for numerical eigenvalue null-space detection
  const nullTol = 1e-5;
  const elim = runElimination(shifted, {
    mode: 'numerical',
    precision: 6,
    tolerance: nullTol,
    reduceAbovePivots: true,
    normalizePivots: true,
  });

  // If numerical noise caused rank == n when expectedMultiplicity >= 1, drop smallest pivot row cleanly
  const freeCols = [...elim.freeColumns];
  if (freeCols.length === 0 && expectedMultiplicity >= 1) {
    // Find row with smallest absolute diagonal/pivot in REF and treat its column as free
    let minCol = n - 1;
    let minVal = Infinity;
    for (let i = 0; i < n; i++) {
      const val = Math.abs(sToNumber(elim.matrix[i][i]));
      if (val < minVal) {
        minVal = val;
        minCol = i;
      }
    }
    if (minVal < 1e-3) {
      freeCols.push(minCol);
    }
  }

  const basis: number[][] = [];
  for (const fc of freeCols) {
    const vec = Array(n).fill(0);
    vec[fc] = 1;
    for (let pIdx = 0; pIdx < elim.pivotColumns.length; pIdx++) {
      const pc = elim.pivotColumns[pIdx];
      if (pc === fc) continue;
      vec[pc] = -sToNumber(elim.matrix[pIdx][fc]);
    }
    // Normalize for clean readable eigenvector or scale nicely
    const maxAbs = Math.max(...vec.map(Math.abs));
    if (maxAbs > 0) {
      for (let i = 0; i < n; i++) vec[i] /= maxAbs;
    }
    basis.push(vec);
  }
  return basis;
}

export function buildEigenReport(
  A: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const rows = A.length;
  const cols = A[0].length;
  const dispA = matrixToDisplayData(A, precision, tolerance);

  if (rows !== cols) {
    return {
      id: crypto.randomUUID(),
      operationId: 'eigen',
      operationName: 'Tìm trị riêng và vectơ riêng',
      algorithmName: 'Đa thức đặc trưng và thuật toán QR dịch chuyển',
      modeUsed: 'numerical',
      isExactResult: false,
      problemStatementLatex: 'Av = \\lambda v,\\quad \\det(A - \\lambda I) = 0',
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [{ label: 'Ma trận vuông', satisfied: false, detail: `A cỡ ${rows} × ${cols} không vuông.` }],
      },
      steps: [],
      resultTitle: 'Không thể tìm trị riêng',
      resultLatex: '\\text{Yêu cầu ma trận vuông}',
      resultText: 'Trị riêng và vectơ riêng chỉ xác định cho ma trận vuông.',
      conclusion: 'Ma trận không vuông nên không có trị riêng.',
      durationMs: performance.now() - start,
    };
  }

  const n = rows;
  const Anum = A.map((r) => r.map((v) => sToNumber(v)));
  const charCoeffs = characteristicPolynomialCoeffs(Anum);
  const polyLatex = formatCharPolyLatex(charCoeffs, precision, tolerance);
  const rawEigenvalues = qrEigenvalues(Anum);
  const grouped = groupEigenvalues(rawEigenvalues, 1e-6);

  const steps: CalculationStep[] = [
    {
      stepNumber: 1,
      stage: 'Tìm đa thức đặc trưng det(λI - A)',
      isMajorStage: true,
      operationNotation: `p(\\lambda) = \\det(\\lambda I_{${n}} - A) = ${polyLatex}`,
      explanation: `Sử dụng thuật toán Faddeev-LeVerrier để xác định các hệ số của đa thức đặc trưng bậc ${n}.`,
      formulaLatex: `${polyLatex} = 0`,
    },
    {
      stepNumber: 2,
      stage: n <= 2 ? 'Giải phương trình đặc trưng' : 'Tính trị riêng bằng thuật toán QR dịch chuyển (Hessenberg + QR)',
      isMajorStage: true,
      operationNotation: n <= 2 ? '\\det(\\lambda I - A) = 0' : 'A \\to H \\to Q R \\text{ (Wilkinson shift)}',
      explanation:
        n <= 2
          ? 'Giải trực tiếp phương trình đặc trưng bậc ≤ 2 bằng công thức nghiệm chính xác/số học.'
          : 'Đưa ma trận về dạng Hessenberg trên bằng phản xạ Householder và lặp QR dịch chuyển Wilkinson để hội tụ về các giá trị riêng.',
    },
  ];

  const eigenPairs: EigenPairSummary[] = [];
  let maxAvResidual = 0;

  for (let idx = 0; idx < grouped.length; idx++) {
    const g = grouped[idx];
    const isComplex = Math.abs(g.value.im) > 1e-6;
    const eigLatex = formatComplexLatex(g.value, precision, tolerance);
    const eigText = formatComplexText(g.value, precision, tolerance);

    if (!isComplex) {
      const basis = computeRealEigenvectorBasis(Anum, g.value.re, g.multiplicity);
      let residual = 0;
      for (const v of basis) {
        for (let i = 0; i < n; i++) {
          let av = 0;
          for (let j = 0; j < n; j++) av += Anum[i][j] * v[j];
          residual = Math.max(residual, Math.abs(av - g.value.re * v[i]));
        }
      }
      maxAvResidual = Math.max(maxAvResidual, residual);

      const vecsLatex = basis.map(
        (v) => `\\begin{bmatrix} ${v.map((x) => formatNumberClean(x, precision, 1e-6)).join(' \\\\ ')} \\end{bmatrix}`
      );
      const vecsText = basis.map((v) => v.map((x) => formatNumberClean(x, precision, 1e-6)));

      eigenPairs.push({
        index: idx + 1,
        eigenvalueLatex: eigLatex,
        eigenvalueText: eigText,
        isComplex: false,
        algebraicMultiplicity: g.multiplicity,
        geometricMultiplicity: basis.length,
        eigenvectorsLatex: vecsLatex,
        eigenvectorsText: vecsText,
        verificationResidual: residual,
      });

      steps.push({
        stepNumber: steps.length + 1,
        stage: `Giải không gian riêng cho λ_{${idx + 1}} = ${eigText}`,
        isMajorStage: true,
        operationNotation: `(A - (${eigLatex})I)v = 0`,
        explanation: `Giải hệ thuần nhất (A - λI)v = 0 tìm được ${basis.length} vectơ riêng độc lập tuyến tính (bội đại số = ${g.multiplicity}, bội hình học = ${basis.length}).`,
        formulaLatex:
          vecsLatex.length > 0
            ? `E(\\lambda_{${idx + 1}}) = \\operatorname{span}\\left\\{ ${vecsLatex.join(',\\; ')} \\right\\}`
            : '\\text{Không tìm thấy vectơ riêng thực ổn định trong ngưỡng dung sai.}',
      });
    } else {
      eigenPairs.push({
        index: idx + 1,
        eigenvalueLatex: eigLatex,
        eigenvalueText: eigText,
        isComplex: true,
        algebraicMultiplicity: g.multiplicity,
        eigenvectorsLatex: [],
        eigenvectorsText: [],
      });

      steps.push({
        stepNumber: steps.length + 1,
        stage: `Trị riêng phức λ_{${idx + 1}} = ${eigText}`,
        isMajorStage: false,
        operationNotation: `\\lambda_{${idx + 1}} = ${eigLatex} \\in \\mathbb{C} \\setminus \\mathbb{R}`,
        explanation: 'Trị riêng là số phức không thực (xuất hiện thành cặp liên hợp phức). Vectơ riêng tương ứng thuộc C^n.',
      });
    }
  }

  const allEigLatex = eigenPairs.map((p) => `\\lambda_{${p.index}} = ${p.eigenvalueLatex}`).join(',\\quad ');
  const allEigText = eigenPairs
    .map((p) => `λ_${p.index} = ${p.eigenvalueText} (bội ${p.algebraicMultiplicity})`)
    .join('; ');

  const algoLabel =
    n <= 2
      ? 'Đa thức đặc trưng bậc ≤ 2 + Giải (A - λI)v = 0 (xấp xỉ số học)'
      : 'Faddeev-LeVerrier + Hessenberg-QR dịch chuyển Wilkinson + Khử Gauss tìm không gian riêng (xấp xỉ số học)';

  return {
    id: crypto.randomUUID(),
    operationId: 'eigen',
    operationName: 'Tìm trị riêng và vectơ riêng',
    algorithmName: algoLabel,
    modeUsed: 'numerical',
    isExactResult: false,
    problemStatementLatex: `Av = \\lambda v,\\quad p(\\lambda) = ${polyLatex} = 0`,
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [{ label: 'Ma trận vuông', satisfied: true, detail: `A là ma trận vuông cấp ${n}.` }],
    },
    steps,
    resultTitle: `Tìm thấy ${eigenPairs.length} trị riêng phân biệt`,
    resultLatex: allEigLatex,
    resultText: allEigText,
    eigenPairs,
    verification: {
      passed: maxAvResidual <= 1e-4,
      label: 'Kiểm chứng Av = λv với các vectơ riêng thực',
      formulaLatex: `\\max \\|Av - \\lambda v\\|_\\infty = ${maxAvResidual.toExponential(2)}`,
      residualNorm: maxAvResidual,
      detail: `Sai số dư lớn nhất của phương trình Av = λv trên các vectơ riêng thực là ${maxAvResidual.toExponential(2)}.`,
    },
    conclusion: `Phương trình đặc trưng là ${polyLatex} = 0. Kết quả được tính bằng thuật toán số học dấu phẩy động (xấp xỉ số học).`,
    limitations: [
      'Với ma trận cấp n ≥ 3, nghiệm tổng quát của đa thức đặc trưng không có công thức căn thức đại số tổng quát (định lý Abel-Ruffini), do đó trị riêng và vectơ riêng là giá trị xấp xỉ số học bằng thuật toán QR.',
      'Vectơ riêng phức của các trị riêng phức thuộc không gian C^n hiện được báo cáo trị riêng phức và chưa liệt kê cơ sở phức.',
    ],
    durationMs: performance.now() - start,
  };
}

export function buildDiagonalizationReport(
  A: Scalar[][],
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const rows = A.length;
  const cols = A[0].length;
  const dispA = matrixToDisplayData(A, precision, tolerance);

  if (rows !== cols) {
    return {
      id: crypto.randomUUID(),
      operationId: 'diagonalization',
      operationName: 'Chéo hóa ma trận (A = PDP^{-1})',
      algorithmName: 'Phân tích trị riêng và kiểm tra độc lập tuyến tính vectơ riêng',
      modeUsed: 'numerical',
      isExactResult: false,
      problemStatementLatex: 'A = P D P^{-1}',
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [{ label: 'Ma trận vuông', satisfied: false, detail: `A cỡ ${rows} × ${cols} không vuông.` }],
      },
      steps: [],
      resultTitle: 'Không thể chéo hóa',
      resultLatex: '\\text{Yêu cầu ma trận vuông}',
      resultText: 'Chỉ ma trận vuông mới có thể chéo hóa.',
      conclusion: 'Ma trận không vuông nên không thể chéo hóa.',
      durationMs: performance.now() - start,
    };
  }

  const n = rows;
  const eigReport = buildEigenReport(A, 'numerical', precision, tolerance);
  const pairs = eigReport.eigenPairs ?? [];
  const hasComplex = pairs.some((p) => p.isComplex);

  if (hasComplex) {
    return {
      ...eigReport,
      id: crypto.randomUUID(),
      operationId: 'diagonalization',
      operationName: 'Chéo hóa ma trận thực (A = PDP^{-1})',
      problemStatementLatex: 'A = P D P^{-1},\\quad P, D \\in \\mathbb{R}^{n\\times n}',
      conditionsCheck: {
        met: false,
        items: [
          { label: 'Ma trận vuông', satisfied: true, detail: `A vuông cấp ${n}.` },
          {
            label: 'Tất cả trị riêng là số thực',
            satisfied: false,
            detail: 'Ma trận có trị riêng phức nên không thể chéo hóa trên trường số thực R.',
          },
        ],
      },
      resultTitle: 'Không chéo hóa được trên R',
      resultLatex: '\\text{Không chéo hóa được trên } \\mathbb{R} \\text{ (có trị riêng phức)}',
      resultText: 'Ma trận có trị riêng phức nên không chéo hóa được trên R.',
      conclusion: 'Ma trận có trị riêng phức nên không tồn tại P, D thực sao cho A = PDP^{-1}.',
      durationMs: performance.now() - start,
    };
  }

  // Collect n real eigenvectors
  const PCols: number[][] = [];
  const diagVals: number[] = [];
  const Anum = A.map((r) => r.map((v) => sToNumber(v)));
  const rawEigs = groupEigenvalues(qrEigenvalues(Anum), 1e-6);

  for (const g of rawEigs) {
    const basis = computeRealEigenvectorBasis(Anum, g.value.re, g.multiplicity);
    for (const v of basis) {
      PCols.push(v);
      diagVals.push(g.value.re);
    }
  }

  if (PCols.length < n) {
    return {
      ...eigReport,
      id: crypto.randomUUID(),
      operationId: 'diagonalization',
      operationName: 'Chéo hóa ma trận (A = PDP^{-1})',
      problemStatementLatex: 'A = P D P^{-1}',
      conditionsCheck: {
        met: false,
        items: [
          { label: 'Ma trận vuông', satisfied: true, detail: `A vuông cấp ${n}.` },
          {
            label: `Có đủ ${n} vectơ riêng độc lập tuyến tính`,
            satisfied: false,
            detail: `Tổng số chiều các không gian riêng chỉ là ${PCols.length} < ${n} (bội hình học < bội đại số).`,
          },
        ],
      },
      resultTitle: 'Ma trận KHÔNG CHÉO HÓA ĐƯỢC',
      resultLatex: `\\sum \\dim E(\\lambda_i) = ${PCols.length} < ${n} \\implies \\text{Không chéo hóa được}`,
      resultText: `Chỉ có ${PCols.length}/${n} vectơ riêng độc lập tuyến tính.`,
      conclusion: `Ma trận không chéo hóa được vì tổng bội hình học (${PCols.length}) nhỏ hơn cấp ma trận (${n}).`,
      durationMs: performance.now() - start,
    };
  }

  // Build P and D as Scalar matrices
  const P: Scalar[][] = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (__, c) => scalarFromNumber(PCols[c][r]))
  );
  const D: Scalar[][] = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (__, c) => scalarFromNumber(r === c ? diagVals[r] : 0))
  );

  const invP = computeInverseRaw(P, 'numerical', precision, 1e-8);
  if (!invP.invertible || !invP.inverse) {
    return {
      ...eigReport,
      id: crypto.randomUUID(),
      operationId: 'diagonalization',
      operationName: 'Chéo hóa ma trận (A = PDP^{-1})',
      resultTitle: 'Không thể nghịch đảo ma trận P',
      resultLatex: '\\det(P) \\approx 0',
      resultText: 'Các vectơ riêng tìm được gần như phụ thuộc tuyến tính.',
      conclusion: 'Không thể tạo ma trận khả nghịch P từ các vectơ riêng số học.',
      durationMs: performance.now() - start,
    };
  }

  const PD = multiplyRawMatrices(P, D);
  const PDPinv = multiplyRawMatrices(PD, invP.inverse);
  const residual = matrixMaxNormDiff(A, PDPinv);

  const dispP = matrixToDisplayData(P, precision, tolerance);
  const dispD = matrixToDisplayData(D, precision, tolerance);
  const dispPinv = matrixToDisplayData(invP.inverse, precision, tolerance);

  return {
    id: crypto.randomUUID(),
    operationId: 'diagonalization',
    operationName: 'Chéo hóa ma trận (A = PDP^{-1})',
    algorithmName: 'Thuật toán QR tìm trị riêng + Không gian riêng + Nghịch đảo Gauss-Jordan (xấp xỉ số học)',
    modeUsed: 'numerical',
    isExactResult: false,
    problemStatementLatex: 'A = P D P^{-1}',
    inputMatrices: [{ name: 'A', rows: n, cols: n, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [
        { label: 'Tất cả trị riêng thực', satisfied: true, detail: 'Mọi trị riêng đều thuộc R.' },
        { label: `Đủ ${n} vectơ riêng độc lập tuyến tính`, satisfied: true, detail: `Ma trận P khả nghịch.` },
      ],
    },
    steps: eigReport.steps,
    resultTitle: 'Ma trận CHÉO HÓA ĐƯỢC (A = PDP^{-1})',
    resultLatex: `P = ${matrixToLatex(P, precision, tolerance)},\\quad D = ${matrixToLatex(D, precision, tolerance)}`,
    resultText: `||A - PDP^{-1}||_∞ = ${residual.toExponential(2)}`,
    secondaryMatrices: [
      { label: 'Ma trận làm chéo P (cột là vectơ riêng)', symbol: 'P', matrix: dispP },
      { label: 'Ma trận đường chéo D (trị riêng trên đường chéo)', symbol: 'D', matrix: dispD },
      { label: 'Ma trận nghịch đảo P^{-1}', symbol: 'P^{-1}', matrix: dispPinv },
    ],
    verification: {
      passed: residual <= 1e-4,
      label: 'Kiểm chứng A = PDP^{-1}',
      formulaLatex: `\\|A - P D P^{-1}\\|_\\infty = ${residual.toExponential(2)}`,
      residualNorm: residual,
      detail: `Sai số tái tạo ||A - PDP^{-1}||_∞ = ${residual.toExponential(2)}.`,
    },
    conclusion: `Ma trận A chéo hóa được trên R thành A = PDP^{-1} với sai số kiểm chứng ${residual.toExponential(2)}.`,
    limitations: eigReport.limitations,
    durationMs: performance.now() - start,
  };
}
