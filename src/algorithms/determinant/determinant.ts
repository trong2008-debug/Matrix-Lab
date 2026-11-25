import {
  CalculationReport,
  CalculationStep,
  DeterminantMethod,
  ResolvedComputationMode,
  Scalar,
} from '@/src/types/math';
import {
  DEFAULT_PRECISION,
  DEFAULT_TOLERANCE,
  matrixToDisplayData,
  sAdd,
  scalarOne,
  scalarZero,
  sIsZero,
  sMul,
  sNeg,
  sSub,
  sToLatex,
  sToText,
} from '../arithmetic/scalar';
import { runElimination } from '../elimination/echelon';
import { computeLURaw } from '../decomposition/decompositions';

export function getMinorMatrix(M: Scalar[][], skipRow: number, skipCol: number): Scalar[][] {
  const res: Scalar[][] = [];
  for (let i = 0; i < M.length; i++) {
    if (i === skipRow) continue;
    const row: Scalar[] = [];
    for (let j = 0; j < M[0].length; j++) {
      if (j === skipCol) continue;
      row.push(M[i][j]);
    }
    res.push(row);
  }
  return res;
}

export function computeDeterminantGauss(
  A: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): { det: Scalar; steps: CalculationStep[]; upper: Scalar[][]; rowSwaps: number } {
  const elim = runElimination(A, {
    mode,
    precision,
    tolerance,
    reduceAbovePivots: false,
    normalizePivots: false,
  });

  const n = A.length;
  let prod = scalarOne(mode);
  const diagLatex: string[] = [];
  for (let i = 0; i < n; i++) {
    prod = sMul(prod, elim.matrix[i][i]);
    const valL = sToLatex(elim.matrix[i][i], precision, tolerance);
    diagLatex.push(valL.startsWith('-') ? `(${valL})` : valL);
  }
  const det = elim.rowSwaps % 2 === 1 ? sNeg(prod) : prod;

  const signText = elim.rowSwaps % 2 === 1 ? '(-1)^{' + elim.rowSwaps + '} = -1' : '(-1)^{' + elim.rowSwaps + '} = 1';
  const steps: CalculationStep[] = [
    ...elim.steps,
    {
      stepNumber: elim.steps.length + 1,
      stage: 'Tính định thức từ đường chéo chính',
      isMajorStage: true,
      operationNotation: `\\det(A) = (-1)^{${elim.rowSwaps}} \\prod_{i=1}^{${n}} U_{ii}`,
      explanation: `Nhân các phần tử trên đường chéo chính của ma trận tam giác trên sau khử Gauss và nhân thêm dấu từ ${elim.rowSwaps} lần hoán đổi hàng.`,
      formulaLatex: `\\det(A) = ${signText === '(-1)^{0} = 1' ? '' : `${signText} \\cdot `}${diagLatex.join(' \\cdot ')} = ${sToLatex(det, precision, tolerance)}`,
    },
  ];

  return { det, steps, upper: elim.matrix, rowSwaps: elim.rowSwaps };
}

export function computeDeterminantLaplace(
  A: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE,
  depth: number = 0,
  stepList: CalculationStep[] = []
): Scalar {
  const n = A.length;
  if (n === 1) {
    return A[0][0];
  }
  if (n === 2) {
    const ad = sMul(A[0][0], A[1][1]);
    const bc = sMul(A[0][1], A[1][0]);
    const val = sSub(ad, bc);
    if (depth === 0) {
      stepList.push({
        stepNumber: stepList.length + 1,
        stage: 'Công thức định thức cấp 2',
        isMajorStage: true,
        operationNotation: '\\det(A) = a_{11}a_{22} - a_{12}a_{21}',
        explanation: 'Áp dụng trực tiếp công thức định thức cho ma trận vuông cấp 2.',
        formulaLatex: `\\det(A) = (${sToLatex(A[0][0], precision, tolerance)})(${sToLatex(A[1][1], precision, tolerance)}) - (${sToLatex(A[0][1], precision, tolerance)})(${sToLatex(A[1][0], precision, tolerance)}) = ${sToLatex(val, precision, tolerance)}`,
      });
    }
    return val;
  }

  // Choose row with maximum number of zeros for optimal genuine Laplace expansion
  let bestRow = 0;
  let maxZeros = -1;
  for (let i = 0; i < n; i++) {
    let zeros = 0;
    for (let j = 0; j < n; j++) {
      if (sIsZero(A[i][j], tolerance)) zeros++;
    }
    if (zeros > maxZeros) {
      maxZeros = zeros;
      bestRow = i;
    }
  }

  let total = scalarZero(mode);
  const expansionTerms: string[] = [];

  for (let j = 0; j < n; j++) {
    const entry = A[bestRow][j];
    if (sIsZero(entry, tolerance)) continue;
    const minor = getMinorMatrix(A, bestRow, j);
    const minorDet = computeDeterminantLaplace(minor, mode, precision, tolerance, depth + 1, stepList);
    const sign = (bestRow + j) % 2 === 0 ? 1 : -1;
    const term = sign === 1 ? sMul(entry, minorDet) : sNeg(sMul(entry, minorDet));
    total = sAdd(total, term);

    if (depth === 0) {
      const signPrefix = sign === 1 ? '+' : '-';
      expansionTerms.push(
        `${signPrefix} (${sToLatex(entry, precision, tolerance)}) \\cdot \\det(M_{${bestRow + 1},${j + 1}})`
      );
      stepList.push({
        stepNumber: stepList.length + 1,
        stage: `Tính phần bù đại số theo phần tử (${bestRow + 1}, ${j + 1})`,
        isMajorStage: false,
        operationNotation: `C_{${bestRow + 1},${j + 1}} = (-1)^{${bestRow + 1}+${j + 1}} \\det(M_{${bestRow + 1},${j + 1}})`,
        explanation: `Ma trận con bỏ hàng ${bestRow + 1} và cột ${j + 1} có định thức bằng ${sToText(minorDet, precision, tolerance)}.`,
        matrixBefore: matrixToDisplayData(minor, precision, tolerance),
        formulaLatex: `(-1)^{${bestRow + j + 2}} (${sToLatex(entry, precision, tolerance)}) \\cdot (${sToLatex(minorDet, precision, tolerance)}) = ${sToLatex(term, precision, tolerance)}`,
      });
    }
  }

  if (depth === 0) {
    stepList.push({
      stepNumber: stepList.length + 1,
      stage: `Tổng hợp khai triển Laplace theo hàng ${bestRow + 1}`,
      isMajorStage: true,
      operationNotation: `\\det(A) = \\sum_{j=1}^{${n}} (-1)^{${bestRow + 1}+j} a_{${bestRow + 1}j} \\det(M_{${bestRow + 1}j})`,
      explanation: `Cộng tất cả các số hạng khác không trong khai triển theo hàng ${bestRow + 1}${maxZeros > 0 ? ` (hàng có ${maxZeros} phần tử 0)` : ''}.`,
      formulaLatex:
        expansionTerms.length > 0
          ? `\\det(A) = ${expansionTerms.join(' ')} = ${sToLatex(total, precision, tolerance)}`
          : `\\det(A) = 0`,
    });
  }

  return total;
}

export function computeDeterminantScalar(
  A: Scalar[][],
  mode: ResolvedComputationMode,
  tolerance: number = DEFAULT_TOLERANCE
): Scalar {
  const n = A.length;
  if (n === 1) return A[0][0];
  if (n === 2) return sSub(sMul(A[0][0], A[1][1]), sMul(A[0][1], A[1][0]));
  return computeDeterminantGauss(A, mode, DEFAULT_PRECISION, tolerance).det;
}

export function buildDeterminantReport(
  A: Scalar[][],
  requestedMethod: DeterminantMethod,
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
      operationId: 'determinant',
      operationName: 'Tính định thức (det A)',
      algorithmName: 'Kiểm tra điều kiện vuông',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: '\\det(A)',
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [
          {
            label: 'Ma trận vuông',
            satisfied: false,
            detail: `Không thể tính định thức của ma trận không vuông cỡ ${rows} × ${cols}.`,
          },
        ],
      },
      steps: [],
      resultTitle: 'Không thể tính định thức',
      resultLatex: '\\text{Không xác định (ma trận không vuông)}',
      resultText: 'Định thức chỉ xác định cho ma trận vuông.',
      conclusion: 'Không thể tính định thức của ma trận không vuông.',
      durationMs: performance.now() - start,
    };
  }

  let actualMethod: 'gauss' | 'laplace' | 'lu' = 'gauss';
  const limitations: string[] = [];

  if (requestedMethod === 'laplace') {
    if (rows <= 6) {
      actualMethod = 'laplace';
    } else {
      actualMethod = 'gauss';
      limitations.push(
        `Khai triển Laplace có độ phức tạp O(n!) nên chỉ áp dụng cho cấp n ≤ 6. Với cấp ${rows}, hệ thống tự động sử dụng khử Gauss O(n³).`
      );
    }
  } else if (requestedMethod === 'lu') {
    actualMethod = 'lu';
  } else if (requestedMethod === 'gauss') {
    actualMethod = 'gauss';
  } else {
    // auto
    actualMethod = rows <= 3 ? 'laplace' : 'gauss';
  }

  let det: Scalar;
  let steps: CalculationStep[] = [];
  let algoLabel = '';

  if (actualMethod === 'laplace') {
    algoLabel =
      mode === 'exact'
        ? 'Phương pháp khai triển Laplace (số học phân số chính xác)'
        : 'Phương pháp khai triển Laplace (dấu phẩy động)';
    det = computeDeterminantLaplace(A, mode, precision, tolerance, 0, steps);
  } else if (actualMethod === 'lu') {
    const lu = computeLURaw(A, mode, precision, tolerance);
    algoLabel =
      mode === 'exact'
        ? 'Phương pháp phân tích PA = LU (số học phân số chính xác)'
        : 'Phương pháp phân tích PA = LU (chọn trụ từng phần)';
    let prod = scalarOne(mode);
    const diagTerms: string[] = [];
    for (let i = 0; i < rows; i++) {
      prod = sMul(prod, lu.U[i][i]);
      const dL = sToLatex(lu.U[i][i], precision, tolerance);
      diagTerms.push(dL.startsWith('-') ? `(${dL})` : dL);
    }
    det = lu.rowSwaps % 2 === 1 ? sNeg(prod) : prod;
    steps = [
      ...lu.steps,
      {
        stepNumber: lu.steps.length + 1,
        stage: 'Tính định thức từ phân tích PA = LU',
        isMajorStage: true,
        operationNotation: `\\det(A) = \\det(P)^{-1} \\det(L) \\det(U) = (-1)^{${lu.rowSwaps}} \\prod_{i=1}^{${rows}} U_{ii}`,
        explanation: `Vì det(L) = 1 và det(P) = (-1)^{${lu.rowSwaps}}, định thức của A bằng tích các phần tử đường chéo của U nhân dấu hoán vị.`,
        formulaLatex: `\\det(A) = (-1)^{${lu.rowSwaps}} \\cdot (${diagTerms.join(' \\cdot ')}) = ${sToLatex(det, precision, tolerance)}`,
      },
    ];
  } else {
    algoLabel =
      mode === 'exact'
        ? 'Phương pháp khử Gauss (số học phân số chính xác)'
        : 'Phương pháp khử Gauss có chọn phần tử trụ từng phần';
    const g = computeDeterminantGauss(A, mode, precision, tolerance);
    det = g.det;
    steps = g.steps;
  }

  const detLatex = sToLatex(det, precision, tolerance);
  const detText = sToText(det, precision, tolerance);
  const isSingular = sIsZero(det, tolerance);

  if (mode === 'numerical') {
    limitations.push(`Kết quả xấp xỉ số học với ngưỡng 0 bằng ${tolerance}.`);
  }

  return {
    id: crypto.randomUUID(),
    operationId: 'determinant',
    operationName: 'Tính định thức (det A)',
    algorithmName: algoLabel,
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `\\det(A_{${rows}\\times ${rows}})`,
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [
        {
          label: 'Ma trận vuông',
          satisfied: true,
          detail: `Ma trận A là ma trận vuông cấp ${rows}.`,
        },
      ],
    },
    steps,
    resultTitle: 'Định thức của ma trận A',
    resultLatex: `\\det(A) = ${detLatex}`,
    resultText: `det(A) = ${detText}`,
    verification: {
      passed: true,
      label: 'Ý nghĩa tính khả nghịch',
      formulaLatex: isSingular ? '\\det(A) = 0 \\implies A \\text{ suy biến}' : '\\det(A) \\neq 0 \\implies A \\text{ khả nghịch}',
      detail: isSingular
        ? 'Định thức bằng 0 nên ma trận suy biến (không khả nghịch).'
        : 'Định thức khác 0 nên ma trận khả nghịch.',
    },
    conclusion: `Định thức của ma trận A cấp ${rows} bằng ${detText}. Ma trận ${isSingular ? 'suy biến (không có nghịch đảo)' : 'khả nghịch'}.`,
    limitations: limitations.length > 0 ? limitations : undefined,
    durationMs: performance.now() - start,
  };
}
