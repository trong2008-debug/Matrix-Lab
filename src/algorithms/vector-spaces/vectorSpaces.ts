import {
  CalculationReport,
  ResolvedComputationMode,
  Scalar,
} from '@/src/types/math';
import {
  DEFAULT_PRECISION,
  DEFAULT_TOLERANCE,
  matrixMaxNormDiff,
  matrixToDisplayData,
  multiplyRawMatrices,
  scalarOne,
  scalarZero,
  sIsOne,
  sIsZero,
  sNeg,
  sToLatex,
  sToNumber,
  sToText,
  vectorToLatex,
} from '../arithmetic/scalar';
import { runElimination } from '../elimination/echelon';

export function computeNullSpaceBasis(
  A: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): {
  basis: Scalar[][]; // list of column vectors (each Scalar[])
  rref: Scalar[][];
  pivotColumns: number[];
  freeColumns: number[];
  steps: ReturnType<typeof runElimination>['steps'];
} {
  const elim = runElimination(A, {
    mode,
    precision,
    tolerance,
    reduceAbovePivots: true,
    normalizePivots: true,
  });

  const n = A[0].length;
  const basis: Scalar[][] = [];

  for (const freeCol of elim.freeColumns) {
    const vec: Scalar[] = Array(n).fill(scalarZero(mode));
    vec[freeCol] = scalarOne(mode);
    for (let pIdx = 0; pIdx < elim.pivotColumns.length; pIdx++) {
      const pCol = elim.pivotColumns[pIdx];
      vec[pCol] = sNeg(elim.matrix[pIdx][freeCol]);
    }
    basis.push(vec);
  }

  return {
    basis,
    rref: elim.matrix,
    pivotColumns: elim.pivotColumns,
    freeColumns: elim.freeColumns,
    steps: elim.steps,
  };
}

export function buildSolutionSpaceReport(
  A: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const rows = A.length;
  const cols = A[0].length;
  const dispA = matrixToDisplayData(A, precision, tolerance);
  const ns = computeNullSpaceBasis(A, mode, precision, tolerance);
  const nullity = ns.basis.length;
  const rank = ns.pivotColumns.length;

  let resultLatex = '\\mathcal{N}(A) = \\{\\mathbf{0}\\}';
  let resultText = 'N(A) = {0} (chỉ có nghiệm tầm thường, dim = 0)';
  let secondaryMatrices: { label: string; symbol: string; matrix: ReturnType<typeof matrixToDisplayData> }[] = [];

  if (nullity > 0) {
    const vecsLatex = ns.basis.map((v) => vectorToLatex(v, precision, tolerance));
    resultLatex = `\\mathcal{N}(A) = \\operatorname{span}\\left\\{ ${vecsLatex.join(',\\; ')} \\right\\}`;
    resultText =
      `dim N(A) = ${nullity}. Cơ sở gồm ${nullity} vectơ:\n` +
      ns.basis.map((v, idx) => `v_${idx + 1} = [${v.map((x) => sToText(x, precision, tolerance)).join(', ')}]^T`).join('\n');

    const basisMatrix = Array.from({ length: cols }, (_, r) => ns.basis.map((vec) => vec[r]));
    secondaryMatrices = [
      {
        label: 'Ma trận các vectơ cơ sở không gian nghiệm (xếp theo cột)',
        symbol: 'N',
        matrix: matrixToDisplayData(basisMatrix, precision, tolerance),
      },
    ];
  }

  // Verify A * v = 0 for all basis vectors
  let maxResidual = 0;
  if (nullity > 0) {
    const basisMatrix = Array.from({ length: cols }, (_, r) => ns.basis.map((vec) => vec[r]));
    const prod = multiplyRawMatrices(A, basisMatrix);
    const zeroMat = Array.from({ length: rows }, () => Array(nullity).fill(scalarZero(mode)));
    maxResidual = matrixMaxNormDiff(prod, zeroMat);
  }

  return {
    id: crypto.randomUUID(),
    operationId: 'solution-space',
    operationName: 'Tìm không gian nghiệm thuần nhất (Null space N(A))',
    algorithmName:
      mode === 'exact'
        ? 'Phương pháp Gauss-Jordan tìm RREF và tách biến tự do (phân số chính xác)'
        : 'Phương pháp Gauss-Jordan tìm RREF và tách biến tự do',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: '\\mathcal{N}(A) = \\{ x \\in \\mathbb{R}^n : Ax = 0 \\}',
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [
        {
          label: 'Hệ thuần nhất Ax = 0 luôn có nghiệm',
          satisfied: true,
          detail: `rank(A) = ${rank}, số ẩn n = ${cols}, số chiều không gian nghiệm dim N(A) = ${nullity}.`,
        },
      ],
    },
    steps: ns.steps,
    resultTitle: `Không gian nghiệm N(A) có số chiều ${nullity}`,
    resultLatex,
    resultText,
    resultMatrix: matrixToDisplayData(ns.rref, precision, tolerance),
    secondaryMatrices,
    verification: {
      passed: mode === 'exact' ? maxResidual === 0 : maxResidual <= Math.max(tolerance * 100, 1e-7),
      label: 'Kiểm chứng Av_i = 0 và định lý hạng - số chiều',
      formulaLatex: `\\operatorname{rank}(A) + \\dim(\\mathcal{N}(A)) = ${rank} + ${nullity} = ${cols}`,
      residualNorm: maxResidual,
      detail:
        nullity === 0
          ? 'Chỉ tồn tại nghiệm tầm thường x = 0.'
          : `Mọi vectơ cơ sở đều thỏa mãn Av_i = 0 (sai số dư cực đại ${maxResidual.toExponential(2)}).`,
    },
    conclusion:
      nullity === 0
        ? 'Hệ thuần nhất Ax = 0 chỉ có nghiệm tầm thường x = 0, không gian nghiệm có số chiều bằng 0.'
        : `Không gian nghiệm N(A) có số chiều bằng ${nullity} với cơ sở gồm ${nullity} vectơ độc lập tuyến tính.`,
    durationMs: performance.now() - start,
  };
}

export function buildRowColSpaceReport(
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
    reduceAbovePivots: true,
    normalizePivots: true,
  });

  const rank = elim.rank;
  const rowBasis = elim.matrix.slice(0, rank);
  const colBasisVecs = elim.pivotColumns.map((colIdx) => A.map((r) => r[colIdx]));

  const rowBasisLatex =
    rank > 0
      ? rowBasis.map((r) => `\\begin{bmatrix} ${r.map((v) => sToLatex(v, precision, tolerance)).join(' & ')} \\end{bmatrix}`).join(',\\; ')
      : '\\varnothing';
  const colBasisLatex =
    rank > 0
      ? colBasisVecs.map((v) => vectorToLatex(v, precision, tolerance)).join(',\\; ')
      : '\\varnothing';

  const secondaryMatrices: { label: string; symbol: string; matrix: ReturnType<typeof matrixToDisplayData> }[] = [];
  if (rank > 0) {
    secondaryMatrices.push({
      label: 'Cơ sở không gian hàng R(A) (các hàng khác 0 của RREF)',
      symbol: 'B_{\\text{hàng}}',
      matrix: matrixToDisplayData(rowBasis, precision, tolerance),
    });
    const colMat = Array.from({ length: rows }, (_, r) => colBasisVecs.map((v) => v[r]));
    secondaryMatrices.push({
      label: 'Cơ sở không gian cột C(A) (các cột trụ của A gốc)',
      symbol: 'B_{\\text{cột}}',
      matrix: matrixToDisplayData(colMat, precision, tolerance),
    });
  }

  return {
    id: crypto.randomUUID(),
    operationId: 'row-col-space',
    operationName: 'Tìm không gian hàng và không gian cột',
    algorithmName:
      mode === 'exact'
        ? 'Phương pháp Gauss-Jordan xác định hàng khác 0 và cột trụ (phân số chính xác)'
        : 'Phương pháp Gauss-Jordan xác định hàng khác 0 và cột trụ',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: '\\mathcal{R}(A) \\text{ và } \\mathcal{C}(A)',
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [
        {
          label: 'Xác định các vị trí trụ từ RREF',
          satisfied: true,
          detail: `Hạng ma trận rank(A) = ${rank}. Các cột trụ của A là: ${elim.pivotColumns.map((c) => c + 1).join(', ') || 'Không có'}.`,
        },
      ],
    },
    steps: elim.steps,
    resultTitle: `dim R(A) = dim C(A) = rank(A) = ${rank}`,
    resultLatex: `\\begin{aligned} \\mathcal{R}(A) &= \\operatorname{span}\\left\\{ ${rowBasisLatex} \\right\\} \\\\ \\mathcal{C}(A) &= \\operatorname{span}\\left\\{ ${colBasisLatex} \\right\\} \\end{aligned}`,
    resultText: `dim R(A) = dim C(A) = ${rank}. Các cột trụ của A: ${elim.pivotColumns.map((c) => c + 1).join(', ') || 'Không có'}.`,
    resultMatrix: matrixToDisplayData(elim.matrix, precision, tolerance),
    secondaryMatrices,
    conclusion: `Không gian hàng R(A) và không gian cột C(A) đều có số chiều bằng ${rank}. Cơ sở của C(A) được lấy từ các cột trụ của ma trận A ban đầu (${elim.pivotColumns.map((c) => `cột ${c + 1}`).join(', ') || 'tập rỗng'}).`,
    durationMs: performance.now() - start,
  };
}

export function buildLinearIndependenceReport(
  A: Scalar[][],
  isBasisMode: boolean,
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const rows = A.length;
  const cols = A[0].length;
  const dispA = matrixToDisplayData(A, precision, tolerance);
  const ns = computeNullSpaceBasis(A, mode, precision, tolerance);
  const rank = ns.pivotColumns.length;
  const isIndependent = rank === cols;
  const spansSpace = rank === rows;
  const isBasisOfRm = isIndependent && spansSpace;

  let relationLatex = '';
  let relationText = '';
  if (!isIndependent && ns.basis.length > 0) {
    const depVec = ns.basis[0];
    const terms: string[] = [];
    const textTerms: string[] = [];
    for (let j = 0; j < cols; j++) {
      if (!sIsZero(depVec[j], tolerance)) {
        const val = depVec[j];
        const neg = sToNumber(val) < 0;
        const absV = neg ? sNeg(val) : val;
        const cLatex = sIsOne(absV, tolerance) ? '' : sToLatex(absV, precision, tolerance);
        const cText = sIsOne(absV, tolerance) ? '' : sToText(absV, precision, tolerance);
        if (terms.length === 0) {
          terms.push(`${neg ? '-' : ''}${cLatex} v_{${j + 1}}`);
          textTerms.push(`${neg ? '-' : ''}${cText}v_${j + 1}`);
        } else {
          terms.push(`${neg ? ' - ' : ' + '}${cLatex} v_{${j + 1}}`);
          textTerms.push(`${neg ? ' - ' : ' + '}${cText}v_${j + 1}`);
        }
      }
    }
    relationLatex = `${terms.join('')} = \\mathbf{0}`;
    relationText = `${textTerms.join('')} = 0`;
  }

  const opId = isBasisMode ? 'basis-dimension' : 'linear-independence';
  const opName = isBasisMode
    ? 'Phân tích cơ sở và số chiều của hệ vectơ cột'
    : 'Kiểm tra độc lập và phụ thuộc tuyến tính';

  const conditionsItems = [
    {
      label: 'Độc lập tuyến tính (rank(A) = số vectơ)',
      satisfied: isIndependent,
      detail: `rank(A) = ${rank} so với số vectơ k = ${cols}.`,
    },
  ];
  if (isBasisMode) {
    conditionsItems.push({
      label: `Sinh toàn bộ không gian R^{${rows}} (rank(A) = ${rows})`,
      satisfied: spansSpace,
      detail: `rank(A) = ${rank} so với số chiều không gian R^{${rows}}.`,
    });
  }

  let resultTitle = '';
  let resultLatex = '';
  let resultText = '';
  let conclusion = '';

  if (isBasisMode) {
    resultTitle = isBasisOfRm
      ? `Hệ vectơ là một CƠ SỞ của R^{${rows}}`
      : `Không gian sinh bởi hệ vectơ có số chiều ${rank}`;
    const basisCols = ns.pivotColumns.map((c) => vectorToLatex(A.map((r) => r[c]), precision, tolerance));
    resultLatex = isBasisOfRm
      ? `\\dim(\\operatorname{span}(S)) = ${rank} = ${rows} \\implies S \\text{ là cơ sở của } \\mathbb{R}^{${rows}}`
      : `\\dim(\\operatorname{span}(S)) = ${rank},\\; \\text{Cơ sở rút trích: } \\left\\{ ${basisCols.join(',\\; ') || '\\varnothing'} \\right\\}`;
    resultText = `Số chiều không gian sinh dim(span) = ${rank}. Các vectơ cơ sở: ${ns.pivotColumns.map((c) => `v_${c + 1}`).join(', ') || 'Không có'}.`;
    conclusion = isBasisOfRm
      ? `Tập ${cols} vectơ trong R^${rows} vừa độc lập tuyến tính vừa sinh ra toàn bộ R^${rows}, do đó tạo thành một cơ sở của R^${rows}.`
      : `Không gian sinh bởi ${cols} vectơ đã cho có số chiều bằng ${rank}. Một cơ sở của không gian sinh này gồm các vectơ: ${ns.pivotColumns.map((c) => `v_${c + 1}`).join(', ') || 'tập rỗng'}.`;
  } else {
    resultTitle = isIndependent ? 'Hệ vectơ ĐỘC LẬP TUYẾN TÍNH' : 'Hệ vectơ PHỤ THUỘC TUYẾN TÍNH';
    resultLatex = isIndependent
      ? `\\operatorname{rank}(A) = ${rank} = ${cols} \\implies \\text{Độc lập tuyến tính}`
      : `\\operatorname{rank}(A) = ${rank} < ${cols} \\implies ${relationLatex}`;
    resultText = isIndependent
      ? `Độc lập tuyến tính (rank = ${rank} = ${cols})`
      : `Phụ thuộc tuyến tính: ${relationText}`;
    conclusion = isIndependent
      ? `Hệ gồm ${cols} vectơ cột của A độc lập tuyến tính vì phương trình c₁v₁ + ... + c_${cols}v_${cols} = 0 chỉ có nghiệm tầm thường.`
      : `Hệ vectơ phụ thuộc tuyến tính vì rank(A) = ${rank} < ${cols}. Một tổ hợp tuyến tính khác không bằng 0 là: ${relationText}.`;
  }

  return {
    id: crypto.randomUUID(),
    operationId: opId,
    operationName: opName,
    algorithmName:
      mode === 'exact'
        ? 'Khử Gauss-Jordan kiểm tra nghiệm hệ thuần nhất Ac = 0 (phân số chính xác)'
        : 'Khử Gauss-Jordan kiểm tra nghiệm hệ thuần nhất Ac = 0',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `c_1 v_1 + c_2 v_2 + \\dots + c_{${cols}} v_{${cols}} = \\mathbf{0},\\quad v_j \\in \\mathbb{R}^{${rows}}`,
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: isBasisMode ? isBasisOfRm : isIndependent,
      items: conditionsItems,
    },
    steps: ns.steps,
    resultTitle,
    resultLatex,
    resultText,
    resultMatrix: matrixToDisplayData(ns.rref, precision, tolerance),
    conclusion,
    durationMs: performance.now() - start,
  };
}
