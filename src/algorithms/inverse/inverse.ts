import {
  CalculationReport,
  CalculationStep,
  ResolvedComputationMode,
  Scalar,
} from '@/src/types/math';
import {
  createIdentityMatrix,
  createZeroMatrix,
  DEFAULT_PRECISION,
  DEFAULT_TOLERANCE,
  matrixMaxNormDiff,
  matrixToDisplayData,
  matrixToLatex,
  multiplyRawMatrices,
  sDiv,
  sIsZero,
  sMul,
  sNeg,
  sToLatex,
  sToText,
} from '../arithmetic/scalar';
import { computeDeterminantScalar, getMinorMatrix } from '../determinant/determinant';
import { runElimination } from '../elimination/echelon';

export function computeInverseRaw(
  A: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): { invertible: boolean; inverse?: Scalar[][]; steps: CalculationStep[]; augmentedEnd: Scalar[][] } {
  const n = A.length;
  const I = createIdentityMatrix(n, mode);
  const augmented = A.map((row, idx) => [...row, ...I[idx]]);

  const elim = runElimination(augmented, {
    mode,
    precision,
    tolerance,
    maxPivotCol: n,
    augmentedSplitCol: n,
    reduceAbovePivots: true,
    normalizePivots: true,
  });

  if (elim.rank < n) {
    return { invertible: false, steps: elim.steps, augmentedEnd: elim.matrix };
  }

  const inverse = elim.matrix.map((row) => row.slice(n));
  return { invertible: true, inverse, steps: elim.steps, augmentedEnd: elim.matrix };
}

export function buildInverseReport(
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
      operationId: 'inverse',
      operationName: 'Tìm ma trận nghịch đảo (A^{-1})',
      algorithmName: 'Phương pháp Gauss-Jordan trên ma trận mở rộng [A | I]',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: 'A^{-1}',
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [
          {
            label: 'Ma trận vuông',
            satisfied: false,
            detail: `A có kích thước ${rows} × ${cols}, không phải ma trận vuông.`,
          },
        ],
      },
      steps: [],
      resultTitle: 'Không tồn tại ma trận nghịch đảo',
      resultLatex: '\\text{Không xác định (không phải ma trận vuông)}',
      resultText: 'Chỉ ma trận vuông mới có thể có nghịch đảo.',
      conclusion: 'Ma trận không vuông nên không tồn tại ma trận nghịch đảo.',
      durationMs: performance.now() - start,
    };
  }

  const invRes = computeInverseRaw(A, mode, precision, tolerance);
  const I = createIdentityMatrix(rows, mode);
  const augmentedStart = A.map((row, idx) => [...row, ...I[idx]]);
  const initStep: CalculationStep = {
    stepNumber: 1,
    stage: 'Lập ma trận mở rộng [A | I]',
    isMajorStage: true,
    operationNotation: `[A \\mid I_{${rows}}]`,
    explanation: `Ghép ma trận đơn vị I_${rows} vào bên phải ma trận A để tiến hành khử Gauss-Jordan.`,
    matrixAfter: matrixToDisplayData(augmentedStart, precision, tolerance, rows),
    augmentedSplitCol: rows,
  };

  const shiftedSteps = invRes.steps.map((s) => ({ ...s, stepNumber: s.stepNumber + 1 }));
  const allSteps = [initStep, ...shiftedSteps];

  if (!invRes.invertible || !invRes.inverse) {
    return {
      id: crypto.randomUUID(),
      operationId: 'inverse',
      operationName: 'Tìm ma trận nghịch đảo (A^{-1})',
      algorithmName:
        mode === 'exact'
          ? 'Phương pháp Gauss-Jordan trên [A | I] (số học phân số chính xác)'
          : 'Phương pháp Gauss-Jordan trên [A | I] có chọn trụ từng phần',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: `[A \\mid I_{${rows}}] \\longrightarrow [I_{${rows}} \\mid A^{-1}]`,
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [
          { label: 'Ma trận vuông', satisfied: true, detail: `A là ma trận vuông cấp ${rows}.` },
          {
            label: 'Ma trận không suy biến (rank(A) = n)',
            satisfied: false,
            detail: `Khi khử [A | I], khối bên trái xuất hiện hàng bằng 0 nên hạng của A nhỏ hơn ${rows}. Do đó det(A) = 0.`,
          },
        ],
      },
      steps: allSteps,
      resultTitle: 'Ma trận không khả nghịch',
      resultLatex: '\\nexists\\, A^{-1} \\quad (\\text{ma trận suy biến})',
      resultText: 'Ma trận suy biến (không khả nghịch).',
      conclusion: `Ma trận A có hạng nhỏ hơn ${rows} (định thức bằng 0), nên ma trận A suy biến và không tồn tại ma trận nghịch đảo A^{-1}.`,
      durationMs: performance.now() - start,
    };
  }

  // Verify A * A^{-1} = I and A^{-1} * A = I
  const prodRight = multiplyRawMatrices(A, invRes.inverse);
  const prodLeft = multiplyRawMatrices(invRes.inverse, A);
  const residualRight = matrixMaxNormDiff(prodRight, I);
  const residualLeft = matrixMaxNormDiff(prodLeft, I);
  const maxResidual = Math.max(residualRight, residualLeft);
  const verified = mode === 'exact' ? maxResidual === 0 : maxResidual <= Math.max(tolerance * 100, 1e-7);

  const dispInv = matrixToDisplayData(invRes.inverse, precision, tolerance);

  return {
    id: crypto.randomUUID(),
    operationId: 'inverse',
    operationName: 'Tìm ma trận nghịch đảo (A^{-1})',
    algorithmName:
      mode === 'exact'
        ? 'Phương pháp Gauss-Jordan trên [A | I] (số học phân số chính xác)'
        : 'Phương pháp Gauss-Jordan trên [A | I] có chọn trụ từng phần',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `[A \\mid I_{${rows}}] \\longrightarrow [I_{${rows}} \\mid A^{-1}]`,
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [
        { label: 'Ma trận vuông', satisfied: true, detail: `A là ma trận vuông cấp ${rows}.` },
        {
          label: 'Ma trận khả nghịch (rank(A) = n)',
          satisfied: true,
          detail: `Khối bên trái biến đổi thành I_${rows}, chứng tỏ rank(A) = ${rows} và det(A) ≠ 0.`,
        },
      ],
    },
    steps: allSteps,
    resultTitle: 'Ma trận nghịch đảo A^{-1}',
    resultLatex: `A^{-1} = ${matrixToLatex(invRes.inverse, precision, tolerance)}`,
    resultText: dispInv.entries.map((r) => `[${r.join(', ')}]`).join('\n'),
    resultMatrix: dispInv,
    verification: {
      passed: verified,
      label: 'Kiểm tra phép nhân nghịch đảo',
      formulaLatex:
        mode === 'exact'
          ? `A A^{-1} = A^{-1} A = I_{${rows}}`
          : `\\|A A^{-1} - I_{${rows}}\\|_\\infty = ${maxResidual.toExponential(2)}`,
      residualNorm: maxResidual,
      detail:
        mode === 'exact'
          ? 'Đã kiểm chứng chính xác cả A·A^{-1} = I và A^{-1}·A = I.'
          : `Sai số dư cực đại max(||AA^{-1} - I||, ||A^{-1}A - I||) = ${maxResidual.toExponential(2)}.`,
    },
    conclusion: `Ma trận A khả nghịch và ma trận nghịch đảo A^{-1} được tìm chính xác bằng phương pháp Gauss-Jordan.`,
    limitations:
      mode === 'numerical'
        ? ['Trong chế độ dấu phẩy động, độ chính xác phụ thuộc vào số điều kiện của ma trận A.']
        : undefined,
    durationMs: performance.now() - start,
  };
}

export function buildAdjugateReport(
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
      operationId: 'adjugate',
      operationName: 'Tìm ma trận phụ hợp (adj A)',
      algorithmName: 'Tính phần bù đại số và chuyển vị',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: '\\operatorname{adj}(A) = C^T',
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [
          {
            label: 'Ma trận vuông',
            satisfied: false,
            detail: `Ma trận có kích thước ${rows} × ${cols}, không phải ma trận vuông.`,
          },
        ],
      },
      steps: [],
      resultTitle: 'Không thể tính ma trận phụ hợp',
      resultLatex: '\\text{Không xác định (không phải ma trận vuông)}',
      resultText: 'Ma trận phụ hợp chỉ xác định cho ma trận vuông.',
      conclusion: 'Không thể tính ma trận phụ hợp cho ma trận không vuông.',
      durationMs: performance.now() - start,
    };
  }

  const n = rows;
  const cofactor = createZeroMatrix(n, n, mode);
  const adj = createZeroMatrix(n, n, mode);
  const steps: CalculationStep[] = [];
  let stepNo = 1;

  if (n === 1) {
    cofactor[0][0] = mode === 'exact' ? { kind: 'rational', value: { num: 1n, den: 1n } } : { kind: 'number', value: 1 };
    adj[0][0] = cofactor[0][0];
    steps.push({
      stepNumber: 1,
      stage: 'Trường hợp cấp 1 × 1',
      isMajorStage: true,
      operationNotation: '\\operatorname{adj}(A) = [1]',
      explanation: 'Theo quy ước, ma trận phụ hợp của ma trận cấp 1 × 1 là ma trận [1] để thỏa mãn A · adj(A) = det(A)I.',
      matrixAfter: matrixToDisplayData(adj, precision, tolerance),
    });
  } else {
    const showDetailedCofactors = n <= 4;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const minor = getMinorMatrix(A, i, j);
        const minorDet = computeDeterminantScalar(minor, mode, tolerance);
        const sign = (i + j) % 2 === 0 ? 1 : -1;
        const cVal = sign === 1 ? minorDet : sNeg(minorDet);
        cofactor[i][j] = cVal;
        adj[j][i] = cVal;
        if (showDetailedCofactors) {
          steps.push({
            stepNumber: stepNo++,
            stage: `Tính phần bù đại số C_{${i + 1},${j + 1}}`,
            isMajorStage: j === 0,
            operationNotation: `C_{${i + 1},${j + 1}} = (-1)^{${i + 1}+${j + 1}} \\det(M_{${i + 1},${j + 1}})`,
            explanation: `Bỏ hàng ${i + 1} và cột ${j + 1}, tính định thức ma trận con thu được ${sToText(minorDet, precision, tolerance)}, nhân dấu ${sign > 0 ? '+1' : '-1'}.`,
            formulaLatex: `C_{${i + 1},${j + 1}} = ${sToLatex(cVal, precision, tolerance)}`,
          });
        }
      }
    }

    steps.push({
      stepNumber: stepNo++,
      stage: 'Lập ma trận phần bù đại số C',
      isMajorStage: true,
      operationNotation: 'C = [C_{ij}]',
      explanation: 'Tập hợp các phần bù đại số vào ma trận C.',
      matrixAfter: matrixToDisplayData(cofactor, precision, tolerance),
    });

    steps.push({
      stepNumber: stepNo++,
      stage: 'Chuyển vị để thu được adj(A)',
      isMajorStage: true,
      operationNotation: '\\operatorname{adj}(A) = C^T',
      explanation: 'Lấy chuyển vị của ma trận phần bù đại số C để thu được ma trận phụ hợp adj(A).',
      matrixBefore: matrixToDisplayData(cofactor, precision, tolerance),
      matrixAfter: matrixToDisplayData(adj, precision, tolerance),
    });
  }

  const detA = computeDeterminantScalar(A, mode, tolerance);
  const detIsZero = sIsZero(detA, tolerance);
  const secondaryMatrices = [
    { label: 'Ma trận phần bù đại số C', symbol: 'C', matrix: matrixToDisplayData(cofactor, precision, tolerance) },
  ];

  if (!detIsZero) {
    const invFromAdj = adj.map((row) => row.map((v) => sDiv(v, detA)));
    secondaryMatrices.push({
      label: 'Nghịch đảo suy ra từ adj(A) / det(A)',
      symbol: 'A^{-1}',
      matrix: matrixToDisplayData(invFromAdj, precision, tolerance),
    });
  }

  // Verify A * adj(A) = det(A) * I
  const prod = multiplyRawMatrices(A, adj);
  const expected = createIdentityMatrix(n, mode).map((row) => row.map((v) => sMul(v, detA)));
  const resNorm = matrixMaxNormDiff(prod, expected);
  const dispAdj = matrixToDisplayData(adj, precision, tolerance);

  return {
    id: crypto.randomUUID(),
    operationId: 'adjugate',
    operationName: 'Tìm ma trận phụ hợp (adj A)',
    algorithmName:
      mode === 'exact'
        ? 'Tính ma trận phần bù đại số C và chuyển vị C^T (số học phân số chính xác)'
        : 'Tính ma trận phần bù đại số C và chuyển vị C^T',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: '\\operatorname{adj}(A) = C^T',
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [{ label: 'Ma trận vuông', satisfied: true, detail: `A là ma trận vuông cấp ${n}.` }],
    },
    steps,
    resultTitle: 'Ma trận phụ hợp adj(A)',
    resultLatex: `\\operatorname{adj}(A) = ${matrixToLatex(adj, precision, tolerance)}`,
    resultText: dispAdj.entries.map((r) => `[${r.join(', ')}]`).join('\n'),
    resultMatrix: dispAdj,
    secondaryMatrices,
    verification: {
      passed: mode === 'exact' ? resNorm === 0 : resNorm <= Math.max(tolerance * 100, 1e-7),
      label: 'Kiểm chứng đồng nhất thức A · adj(A) = det(A) I',
      formulaLatex: `A \\cdot \\operatorname{adj}(A) = (${sToLatex(detA, precision, tolerance)}) I_{${n}}`,
      residualNorm: resNorm,
      detail: detIsZero
        ? `det(A) = 0 nên A · adj(A) = 0; vì vậy không suy ra được nghịch đảo.`
        : `Vì det(A) = ${sToText(detA, precision, tolerance)} ≠ 0, ta có liên hệ A^{-1} = adj(A) / det(A).`,
    },
    conclusion: `Đã tính ma trận phụ hợp adj(A) cấp ${n} và kiểm chứng hệ thức A·adj(A) = det(A)I.`,
    limitations: n > 7 ? ['Tính toàn bộ n² định thức con với cấp lớn có thể tốn thời gian O(n⁵).'] : undefined,
    durationMs: performance.now() - start,
  };
}
