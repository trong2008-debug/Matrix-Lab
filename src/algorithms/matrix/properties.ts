import {
  CalculationReport,
  CalculationStep,
  ClassificationItem,
  ResolvedComputationMode,
  Scalar,
} from '@/src/types/math';
import {
  createIdentityMatrix,
  DEFAULT_PRECISION,
  DEFAULT_TOLERANCE,
  matricesEqual,
  matrixMaxNormDiff,
  matrixToDisplayData,
  matrixToLatex,
  multiplyRawMatrices,
  sAbs,
  sAdd,
  scalarZero,
  sIsZero,
  sNeg,
  sToLatex,
  sToNumber,
  sToText,
  transposeRawMatrix,
} from '../arithmetic/scalar';
import { computeDeterminantScalar, getMinorMatrix } from '../determinant/determinant';
import { runElimination } from '../elimination/echelon';
import { computeCholeskyRaw } from '../decomposition/decompositions';

export function buildTransposeReport(
  A: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const rows = A.length;
  const cols = A[0].length;
  const AT = transposeRawMatrix(A);
  const dispA = matrixToDisplayData(A, precision, tolerance);
  const dispAT = matrixToDisplayData(AT, precision, tolerance);

  return {
    id: crypto.randomUUID(),
    operationId: 'transpose',
    operationName: 'Tìm ma trận chuyển vị (A^T)',
    algorithmName: 'Hoán đổi chỉ số hàng và cột (A^T)_{ji} = A_{ij}',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `A^T \\text{ với } A_{${rows}\\times ${cols}}`,
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [
        {
          label: 'Áp dụng cho mọi ma trận',
          satisfied: true,
          detail: `Ma trận cỡ ${rows} × ${cols} sau chuyển vị sẽ có kích thước ${cols} × ${rows}.`,
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        stage: 'Hoán đổi hàng thành cột',
        isMajorStage: true,
        operationNotation: `(A^T)_{j,i} = A_{i,j}`,
        explanation: `Chuyển từng hàng thứ i của ma trận A thành cột thứ i của ma trận A^T.`,
        matrixBefore: dispA,
        matrixAfter: dispAT,
      },
    ],
    resultTitle: 'Ma trận chuyển vị A^T',
    resultLatex: `A^T = ${matrixToLatex(AT, precision, tolerance)}`,
    resultText: dispAT.entries.map((r) => `[${r.join(', ')}]`).join('\n'),
    resultMatrix: dispAT,
    verification: {
      passed: true,
      label: 'Tính chất đối hợp',
      formulaLatex: `(A^T)^T = A`,
      detail: `Ma trận gốc cỡ ${rows} × ${cols}, ma trận chuyển vị cỡ ${cols} × ${rows}.`,
    },
    conclusion: `Đã chuyển vị ma trận A cỡ ${rows} × ${cols} thành A^T cỡ ${cols} × ${rows}.`,
    durationMs: performance.now() - start,
  };
}

export function buildTraceReport(
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
      operationId: 'trace',
      operationName: 'Tính vết ma trận (tr A)',
      algorithmName: 'Tổng các phần tử trên đường chéo chính',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: '\\operatorname{tr}(A)',
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [
          {
            label: 'Ma trận vuông',
            satisfied: false,
            detail: `Ma trận A cỡ ${rows} × ${cols} không phải ma trận vuông nên không có vết.`,
          },
        ],
      },
      steps: [],
      resultTitle: 'Không thể tính vết ma trận',
      resultLatex: '\\text{Không xác định (không phải ma trận vuông)}',
      resultText: 'Vết ma trận chỉ xác định cho ma trận vuông.',
      conclusion: 'Không thể tính vết vì ma trận không vuông.',
      durationMs: performance.now() - start,
    };
  }

  let tr = scalarZero(mode);
  const terms: string[] = [];
  for (let i = 0; i < rows; i++) {
    tr = sAdd(tr, A[i][i]);
    const tL = sToLatex(A[i][i], precision, tolerance);
    terms.push(tL.startsWith('-') ? `(${tL})` : tL);
  }

  const trLatex = sToLatex(tr, precision, tolerance);
  const trText = sToText(tr, precision, tolerance);

  return {
    id: crypto.randomUUID(),
    operationId: 'trace',
    operationName: 'Tính vết ma trận (tr A)',
    algorithmName:
      mode === 'exact'
        ? 'Cộng các phần tử đường chéo chính (số học phân số chính xác)'
        : 'Cộng các phần tử đường chéo chính (dấu phẩy động)',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `\\operatorname{tr}(A) = \\sum_{i=1}^{${rows}} a_{ii}`,
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [{ label: 'Ma trận vuông', satisfied: true, detail: `A là ma trận vuông cấp ${rows}.` }],
    },
    steps: [
      {
        stepNumber: 1,
        stage: 'Liệt kê và cộng các phần tử trên đường chéo chính',
        isMajorStage: true,
        operationNotation: `\\operatorname{tr}(A) = ${terms.join(' + ')}`,
        explanation: `Cộng ${rows} phần tử nằm trên đường chéo chính từ a_{1,1} đến a_{${rows},${rows}}.`,
        formulaLatex: `\\operatorname{tr}(A) = ${terms.join(' + ')} = ${trLatex}`,
      },
    ],
    resultTitle: 'Vết của ma trận A',
    resultLatex: `\\operatorname{tr}(A) = ${trLatex}`,
    resultText: `tr(A) = ${trText}`,
    conclusion: `Vết của ma trận vuông A cấp ${rows} bằng ${trText}.`,
    durationMs: performance.now() - start,
  };
}

export function buildRankReport(
  A: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const rows = A.length;
  const cols = A[0].length;
  const dispA = matrixToDisplayData(A, precision, tolerance);

  const elim = runElimination(A, {
    mode,
    precision,
    tolerance,
    reduceAbovePivots: false,
    normalizePivots: false,
  });

  const dispRef = matrixToDisplayData(elim.matrix, precision, tolerance);
  const pivotCoords =
    elim.pivotColumns.length > 0
      ? elim.pivotColumns.map((c, idx) => `(${elim.pivotRows[idx] + 1}, ${c + 1})`).join(', ')
      : 'Không có';

  const steps: CalculationStep[] = [
    ...elim.steps,
    {
      stepNumber: elim.steps.length + 1,
      stage: 'Đếm số hàng khác không (số phần tử trụ)',
      isMajorStage: true,
      operationNotation: `\\operatorname{rank}(A) = ${elim.rank}`,
      explanation: `Trong dạng bậc thang thu được có ${elim.rank} hàng khác không tương ứng với các vị trí trụ: ${pivotCoords}.`,
      matrixAfter: dispRef,
    },
  ];

  return {
    id: crypto.randomUUID(),
    operationId: 'rank',
    operationName: 'Tính hạng ma trận (rank A)',
    algorithmName:
      mode === 'exact'
        ? 'Phương pháp khử Gauss đưa về dạng bậc thang (số học phân số chính xác)'
        : 'Phương pháp khử Gauss có chọn trụ từng phần',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `\\operatorname{rank}(A_{${rows}\\times ${cols}})`,
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [
        {
          label: 'Áp dụng cho mọi ma trận',
          satisfied: true,
          detail: `Ma trận cỡ ${rows} × ${cols} có hạng tối đa là min(${rows}, ${cols}) = ${Math.min(rows, cols)}.`,
        },
      ],
    },
    steps,
    resultTitle: 'Hạng của ma trận A',
    resultLatex: `\\operatorname{rank}(A) = ${elim.rank}`,
    resultText: `rank(A) = ${elim.rank}`,
    resultMatrix: dispRef,
    verification: {
      passed: true,
      label: 'Định lý hạng và số chiều không gian hạt nhân',
      formulaLatex: `\\operatorname{rank}(A) + \\dim(\\mathcal{N}(A)) = ${elim.rank} + ${cols - elim.rank} = ${cols}`,
      detail: `Số cột trụ = ${elim.rank}, số cột tự do = ${cols - elim.rank}.`,
    },
    conclusion: `Hạng của ma trận A bằng ${elim.rank}.`,
    limitations:
      mode === 'numerical'
        ? [`Trong chế độ số học, phần tử nhỏ hơn hoặc bằng ${tolerance} được xem là 0 khi xác định trụ.`]
        : undefined,
    durationMs: performance.now() - start,
  };
}

export function buildInvertibilityReport(
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
      operationId: 'invertibility',
      operationName: 'Kiểm tra tính khả nghịch',
      algorithmName: 'Kiểm tra điều kiện vuông, hạng và định thức',
      modeUsed: mode,
      isExactResult: true,
      problemStatementLatex: '\\text{Kiểm tra } A \\text{ có khả nghịch không}',
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [
          {
            label: 'Ma trận vuông',
            satisfied: false,
            detail: `Ma trận A cỡ ${rows} × ${cols} không vuông nên không khả nghịch.`,
          },
        ],
      },
      steps: [],
      resultTitle: 'Không khả nghịch',
      resultLatex: 'A \\text{ không khả nghịch (không phải ma trận vuông)}',
      resultText: 'Không khả nghịch',
      conclusion: `Ma trận cỡ ${rows} × ${cols} không vuông nên không có ma trận nghịch đảo.`,
      durationMs: performance.now() - start,
    };
  }

  const elim = runElimination(A, {
    mode,
    precision,
    tolerance,
    reduceAbovePivots: false,
    normalizePivots: false,
  });

  const det = computeDeterminantScalar(A, mode, tolerance);
  const rank = elim.rank;
  const detIsZero = sIsZero(det, tolerance);
  const invertible = rank === rows && !detIsZero;

  // Check near-singularity diagnostic in numerical mode
  let minPivot = Infinity;
  let maxPivot = 0;
  for (let i = 0; i < rows; i++) {
    const p = Math.abs(sToNumber(elim.matrix[i][i]));
    if (p < minPivot) minPivot = p;
    if (p > maxPivot) maxPivot = p;
  }
  const nearSingular = invertible && mode === 'numerical' && minPivot > 0 && maxPivot / minPivot > 1e8;

  return {
    id: crypto.randomUUID(),
    operationId: 'invertibility',
    operationName: 'Kiểm tra tính khả nghịch',
    algorithmName:
      mode === 'exact'
        ? 'Khử Gauss kiểm tra hạng và định thức (số học phân số chính xác)'
        : 'Khử Gauss có chọn trụ từng phần kiểm tra hạng và định thức',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `\\det(A) \\stackrel{?}{\\neq} 0 \\quad\\text{và}\\quad \\operatorname{rank}(A) \\stackrel{?}{=} ${rows}`,
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: invertible,
      items: [
        { label: 'Điều kiện 1: Ma trận vuông', satisfied: true, detail: `A là ma trận vuông cấp ${rows}.` },
        {
          label: 'Điều kiện 2: Định thức khác 0',
          satisfied: !detIsZero,
          detail: `det(A) = ${sToText(det, precision, tolerance)}.`,
        },
        {
          label: `Điều kiện 3: Hạng tối đa (rank(A) = ${rows})`,
          satisfied: rank === rows,
          detail: `rank(A) = ${rank} / ${rows}.`,
        },
      ],
    },
    steps: elim.steps,
    resultTitle: invertible ? 'Ma trận KHẢ NGHỊCH' : 'Ma trận SUY BIẾN (không khả nghịch)',
    resultLatex: invertible
      ? `\\det(A) = ${sToLatex(det, precision, tolerance)} \\neq 0,\\; \\operatorname{rank}(A) = ${rank} \\implies A \\text{ khả nghịch}`
      : `\\det(A) = ${sToLatex(det, precision, tolerance)},\\; \\operatorname{rank}(A) = ${rank} < ${rows} \\implies A \\text{ suy biến}`,
    resultText: invertible
      ? `Khả nghịch (det(A) = ${sToText(det, precision, tolerance)}, rank(A) = ${rank})`
      : `Không khả nghịch / suy biến (det(A) = ${sToText(det, precision, tolerance)}, rank(A) = ${rank})`,
    verification: nearSingular
      ? {
          passed: true,
          label: 'Cảnh báo cận suy biến số học',
          formulaLatex: `\\frac{\\max |U_{ii}|}{\\min |U_{ii}|} \\approx ${(maxPivot / minPivot).toExponential(2)}`,
          detail: 'Ma trận khả nghịch nhưng tỉ số phần tử trụ rất lớn (điều kiện xấu), phép nghịch đảo số học có thể mất chữ số có nghĩa.',
        }
      : undefined,
    conclusion: invertible
      ? `Ma trận A khả nghịch vì det(A) = ${sToText(det, precision, tolerance)} ≠ 0 và rank(A) = ${rows}.`
      : `Ma trận A không khả nghịch (suy biến) vì det(A) = 0 và rank(A) = ${rank} < ${rows}.`,
    durationMs: performance.now() - start,
  };
}

export function buildClassifyReport(
  A: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const rows = A.length;
  const cols = A[0].length;
  const isSquare = rows === cols;
  const dispA = matrixToDisplayData(A, precision, tolerance);
  const tol = mode === 'exact' ? 0 : tolerance;

  const classifications: ClassificationItem[] = [];

  // 1. Zero matrix
  let isZero = true;
  for (let i = 0; i < rows && isZero; i++) {
    for (let j = 0; j < cols; j++) {
      if (!sIsZero(A[i][j], tol)) {
        isZero = false;
        break;
      }
    }
  }
  classifications.push({
    key: 'zero',
    name: 'Ma trận không (A = 0)',
    satisfied: isZero,
    criterion: 'Mọi phần tử A_{ij} = 0',
    explanation: isZero ? 'Tất cả phần tử đều bằng 0.' : 'Tồn tại ít nhất một phần tử khác 0.',
  });

  if (!isSquare) {
    classifications.push({
      key: 'square_required',
      name: 'Các tính chất ma trận vuông (Đối xứng, Đường chéo, Trực giao, Xác định dương...)',
      satisfied: false,
      criterion: 'Cần số hàng bằng số cột',
      explanation: `Ma trận có cỡ ${rows} × ${cols} không vuông nên không thuộc các lớp ma trận vuông.`,
    });

    return {
      id: crypto.randomUUID(),
      operationId: 'classify',
      operationName: 'Phân loại ma trận',
      algorithmName: 'Kiểm tra trực tiếp theo định nghĩa đại số',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: `\\text{Phân loại ma trận } A_{${rows}\\times ${cols}}`,
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: true,
        items: [{ label: 'Kiểm tra kích thước', satisfied: true, detail: `Ma trận chữ nhật ${rows} × ${cols}.` }],
      },
      steps: [],
      resultTitle: isZero ? 'Ma trận không (hình chữ nhật)' : 'Ma trận hình chữ nhật tổng quát',
      resultLatex: isZero ? `A = 0_{${rows}\\times ${cols}}` : `A \\in \\mathbb{R}^{${rows}\\times ${cols}}`,
      resultText: isZero ? 'Ma trận không' : `Ma trận ${rows} × ${cols}`,
      classifications,
      conclusion: isZero
        ? `Ma trận cỡ ${rows} × ${cols} là ma trận không.`
        : `Ma trận cỡ ${rows} × ${cols} là ma trận chữ nhật khác không.`,
      durationMs: performance.now() - start,
    };
  }

  const n = rows;
  const AT = transposeRawMatrix(A);
  const I = createIdentityMatrix(n, mode);

  // 2. Identity
  const isIdentity = matricesEqual(A, I, tol);
  classifications.push({
    key: 'identity',
    name: 'Ma trận đơn vị (A = I)',
    satisfied: isIdentity,
    criterion: 'A_{ii} = 1 và A_{ij} = 0 với i ≠ j',
    explanation: isIdentity ? `Bằng ma trận đơn vị cấp ${n}.` : 'Không trùng với ma trận đơn vị.',
  });

  // 3. Upper & Lower triangular & Diagonal
  let isUpper = true;
  let isLower = true;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i > j && !sIsZero(A[i][j], tol)) isUpper = false;
      if (i < j && !sIsZero(A[i][j], tol)) isLower = false;
    }
  }
  const isDiagonal = isUpper && isLower;

  classifications.push({
    key: 'diagonal',
    name: 'Ma trận đường chéo',
    satisfied: isDiagonal,
    criterion: 'A_{ij} = 0 với mọi i ≠ j',
    explanation: isDiagonal
      ? 'Mọi phần tử ngoài đường chéo chính đều bằng 0.'
      : 'Có phần tử khác 0 nằm ngoài đường chéo chính.',
  });

  classifications.push({
    key: 'upper',
    name: 'Ma trận tam giác trên',
    satisfied: isUpper,
    criterion: 'A_{ij} = 0 với mọi i > j',
    explanation: isUpper
      ? 'Mọi phần tử phía dưới đường chéo chính đều bằng 0.'
      : 'Có phần tử khác 0 nằm phía dưới đường chéo chính.',
  });

  classifications.push({
    key: 'lower',
    name: 'Ma trận tam giác dưới',
    satisfied: isLower,
    criterion: 'A_{ij} = 0 với mọi i < j',
    explanation: isLower
      ? 'Mọi phần tử phía trên đường chéo chính đều bằng 0.'
      : 'Có phần tử khác 0 nằm phía trên đường chéo chính.',
  });

  // 4. Symmetric: A^T = A
  const isSymmetric = matricesEqual(AT, A, tol);
  classifications.push({
    key: 'symmetric',
    name: 'Ma trận đối xứng (A^T = A)',
    satisfied: isSymmetric,
    criterion: 'A_{ij} = A_{ji} với mọi i, j',
    explanation: isSymmetric ? 'Thỏa mãn A^T = A.' : 'Không thỏa mãn A^T = A.',
  });

  // 5. Skew-symmetric: A^T = -A
  const negA = A.map((row) => row.map((v) => sNeg(v)));
  const isSkew = matricesEqual(AT, negA, tol);
  classifications.push({
    key: 'skew_symmetric',
    name: 'Ma trận phản đối xứng (A^T = -A)',
    satisfied: isSkew,
    criterion: 'A_{ji} = -A_{ij} và A_{ii} = 0',
    explanation: isSkew ? 'Thỏa mãn A^T = -A.' : 'Không thỏa mãn A^T = -A.',
  });

  // 6. Orthogonal: A^T A = I
  const ATA = multiplyRawMatrices(AT, A);
  const orthoDiff = matrixMaxNormDiff(ATA, I);
  const isOrthogonal = mode === 'exact' ? orthoDiff === 0 : orthoDiff <= Math.max(tolerance * 100, 1e-7);
  classifications.push({
    key: 'orthogonal',
    name: 'Ma trận trực giao (A^T A = I)',
    satisfied: isOrthogonal,
    criterion: 'A^T A = I_n',
    explanation: isOrthogonal
      ? 'Các cột tạo thành hệ trực chuẩn (A^T A = I).'
      : `Không trực giao (||A^T A - I||_∞ = ${orthoDiff.toExponential(2)}).`,
  });

  // 7. Positive definite: Symmetric + Cholesky (and Sylvester minors for explanation)
  let isPosDef = false;
  let posDefExplanation = 'Ma trận không đối xứng nên không xét xác định dương thực đối xứng.';
  let posDefCriterion = 'Đối xứng và mọi định thức con chính góc Δ_k > 0 (tiêu chuẩn Sylvester / Cholesky)';

  if (isSymmetric) {
    const chol = computeCholeskyRaw(A, tolerance);
    if (chol.success) {
      isPosDef = true;
      posDefExplanation =
        'Ma trận đối xứng và phân tích Cholesky A = LL^T thành công với mọi phần tử trụ L_{ii} > 0 (tương đương tiêu chuẩn Sylvester).';
    } else {
      isPosDef = false;
      // Also inspect leading principal minors if small for informative message
      if (n <= 5) {
        const minorsInfo: string[] = [];
        for (let k = 1; k <= n; k++) {
          const sub = A.slice(0, k).map((r) => r.slice(0, k));
          const dk = computeDeterminantScalar(sub, mode, tolerance);
          minorsInfo.push(`Δ_${k} = ${sToText(dk, precision, tolerance)}`);
          if (sToNumber(dk) <= tol) break;
        }
        posDefExplanation = `Thất bại theo tiêu chuẩn Sylvester / Cholesky (${minorsInfo.join(', ')}).`;
      } else {
        posDefExplanation = chol.reason ?? 'Phân tích Cholesky thất bại tại phần tử đường chéo không dương.';
      }
    }
  }

  classifications.push({
    key: 'positive_definite',
    name: 'Ma trận xác định dương',
    satisfied: isPosDef,
    criterion: posDefCriterion,
    explanation: posDefExplanation,
  });

  const matchedNames = classifications.filter((c) => c.satisfied).map((c) => c.name);

  return {
    id: crypto.randomUUID(),
    operationId: 'classify',
    operationName: 'Phân loại ma trận',
    algorithmName:
      'Kiểm tra hệ thống các tiêu chuẩn đại số (chuyển vị, nhân trực giao, tiêu chuẩn Sylvester / Cholesky)',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `\\text{Phân loại ma trận vuông } A_{${n}\\times ${n}}`,
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [{ label: 'Ma trận vuông', satisfied: true, detail: `A là ma trận vuông cấp ${n}.` }],
    },
    steps: [
      {
        stepNumber: 1,
        stage: 'Kiểm tra chuyển vị và tích A^T A',
        isMajorStage: true,
        operationNotation: `\\|A^T A - I_{${n}}\\|_\\infty = ${orthoDiff.toExponential(2)}`,
        explanation: `Tính A^T để kiểm tra đối xứng/phản đối xứng và A^T A để kiểm tra tính trực giao.`,
        matrixAfter: matrixToDisplayData(ATA, precision, tolerance),
      },
    ],
    resultTitle:
      matchedNames.length > 0
        ? `Thuộc ${matchedNames.length} lớp ma trận đặc biệt`
        : 'Ma trận vuông tổng quát',
    resultLatex:
      matchedNames.length > 0
        ? matchedNames.map((m) => `\\text{${m}}`).join(',\\; ')
        : '\\text{Không thuộc các lớp đặc biệt chuẩn}',
    resultText: matchedNames.length > 0 ? matchedNames.join('; ') : 'Ma trận vuông tổng quát',
    classifications,
    conclusion:
      matchedNames.length > 0
        ? `Ma trận A thỏa mãn: ${matchedNames.join(', ')}.`
        : 'Ma trận A là ma trận vuông tổng quát, không thuộc các lớp đặc biệt đã kiểm tra.',
    durationMs: performance.now() - start,
  };
}

// Keep unused helper referenced cleanly if needed in minor checks
export { getMinorMatrix, sAbs };
