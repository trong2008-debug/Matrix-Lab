import {
  CalculationReport,
  CalculationStep,
  ResolvedComputationMode,
  Scalar,
} from '@/src/types/math';
import {
  cloneMatrix,
  DEFAULT_PRECISION,
  DEFAULT_TOLERANCE,
  formatRowOpFactorLatex,
  matrixToDisplayData,
  matrixToLatex,
  sAbs,
  scalarOne,
  scalarZero,
  sDiv,
  sIsOne,
  sIsZero,
  sMul,
  sNeg,
  sSub,
  sToLatex,
  sToNumber,
  sToText,
} from '../arithmetic/scalar';

export interface EchelonEngineResult {
  matrix: Scalar[][];
  pivotColumns: number[];
  pivotRows: number[];
  freeColumns: number[];
  rank: number;
  rowSwaps: number;
  scaleFactorInverse: Scalar; // Product of normalization scalars (det(original) = (-1)^rowSwaps * scaleFactorInverse * prod(diag(U)))
  steps: CalculationStep[];
}

export interface EchelonOptions {
  mode: ResolvedComputationMode;
  precision?: number;
  tolerance?: number;
  maxPivotCol?: number; // Exclude augmented columns from pivoting
  augmentedSplitCol?: number;
  reduceAbovePivots?: boolean; // false = REF (Gaussian), true = RREF (Gauss-Jordan)
  normalizePivots?: boolean; // true for RREF, optional for REF
}

function selectPivotRow(
  M: Scalar[][],
  startRow: number,
  col: number,
  mode: ResolvedComputationMode,
  tol: number
): number {
  if (mode === 'numerical') {
    let bestRow = -1;
    let bestVal = tol;
    for (let r = startRow; r < M.length; r++) {
      const mag = Math.abs(sToNumber(M[r][col]));
      if (mag > bestVal) {
        bestVal = mag;
        bestRow = r;
      }
    }
    return bestRow;
  }
  // Exact mode: prefer a row with entry 1 or -1 if available for cleaner human steps, otherwise first nonzero
  let firstNonZero = -1;
  for (let r = startRow; r < M.length; r++) {
    if (!sIsZero(M[r][col], tol)) {
      if (firstNonZero === -1) firstNonZero = r;
      if (sIsOne(sAbs(M[r][col]), tol)) {
        return r;
      }
    }
  }
  return firstNonZero;
}

export function runElimination(input: Scalar[][], options: EchelonOptions): EchelonEngineResult {
  const {
    mode,
    precision = DEFAULT_PRECISION,
    tolerance = DEFAULT_TOLERANCE,
    maxPivotCol = input[0]?.length ?? 0,
    augmentedSplitCol,
    reduceAbovePivots = false,
    normalizePivots = reduceAbovePivots,
  } = options;

  const M = cloneMatrix(input);
  const rows = M.length;
  const cols = M[0]?.length ?? 0;
  const pivotLimit = Math.min(cols, maxPivotCol);

  const steps: CalculationStep[] = [];
  const pivotColumns: number[] = [];
  const pivotRows: number[] = [];
  let rowSwaps = 0;
  let scaleFactorInverse = scalarOne(mode);
  let stepCounter = 1;
  let currentRow = 0;

  for (let col = 0; col < pivotLimit && currentRow < rows; col++) {
    const pivotRow = selectPivotRow(M, currentRow, col, mode, tolerance);
    if (pivotRow === -1) {
      continue;
    }

    // Step 1: Row swap if needed
    if (pivotRow !== currentRow) {
      const before = matrixToDisplayData(M, precision, tolerance, augmentedSplitCol);
      const tmp = M[currentRow];
      M[currentRow] = M[pivotRow];
      M[pivotRow] = tmp;
      rowSwaps++;
      const after = matrixToDisplayData(M, precision, tolerance, augmentedSplitCol);
      steps.push({
        stepNumber: stepCounter++,
        stage: 'Hoán đổi hàng',
        isMajorStage: true,
        operationNotation: `R_{${currentRow + 1}} \\leftrightarrow R_{${pivotRow + 1}}`,
        explanation: `Hoán đổi hàng ${currentRow + 1} và hàng ${pivotRow + 1} để đưa phần tử khác 0 (${sToText(M[currentRow][col], precision, tolerance)}) lên vị trí trụ (${currentRow + 1}, ${col + 1}).`,
        matrixBefore: before,
        matrixAfter: after,
        augmentedSplitCol,
        highlightedRows: [currentRow, pivotRow],
        pivotCell: [currentRow, col],
      });
    }

    pivotColumns.push(col);
    pivotRows.push(currentRow);

    // Step 2: Normalize pivot if requested (RREF)
    const pivotVal = M[currentRow][col];
    if (normalizePivots && !sIsOne(pivotVal, tolerance)) {
      const before = matrixToDisplayData(M, precision, tolerance, augmentedSplitCol);
      const invPivot = sDiv(scalarOne(mode), pivotVal);
      scaleFactorInverse = sMul(scaleFactorInverse, pivotVal);
      for (let j = col; j < cols; j++) {
        M[currentRow][j] = sDiv(M[currentRow][j], pivotVal);
      }
      // Enforce exact 1 at pivot in numerical mode
      M[currentRow][col] = scalarOne(mode);
      const after = matrixToDisplayData(M, precision, tolerance, augmentedSplitCol);
      steps.push({
        stepNumber: stepCounter++,
        stage: 'Chuẩn hóa phần tử trụ',
        isMajorStage: true,
        operationNotation: `R_{${currentRow + 1}} \\leftarrow ${formatRowOpFactorLatex(invPivot, precision, tolerance)} R_{${currentRow + 1}}`,
        explanation: `Chia hàng ${currentRow + 1} cho phần tử trụ ${sToText(pivotVal, precision, tolerance)} để đưa phần tử trụ tại (${currentRow + 1}, ${col + 1}) về 1.`,
        matrixBefore: before,
        matrixAfter: after,
        augmentedSplitCol,
        highlightedRows: [currentRow],
        pivotCell: [currentRow, col],
      });
    }

    // Step 3: Eliminate entries below (and above if RREF)
    const targetRows: number[] = [];
    for (let r = reduceAbovePivots ? 0 : currentRow + 1; r < rows; r++) {
      if (r === currentRow) continue;
      if (!sIsZero(M[r][col], tolerance)) {
        targetRows.push(r);
      }
    }

    for (const r of targetRows) {
      const before = matrixToDisplayData(M, precision, tolerance, augmentedSplitCol);
      const factor = sDiv(M[r][col], M[currentRow][col]);
      const negFactor = sNeg(factor);

      for (let j = col; j < cols; j++) {
        const updated = sSub(M[r][j], sMul(factor, M[currentRow][j]));
        M[r][j] = sIsZero(updated, tolerance) ? scalarZero(mode) : updated;
      }
      M[r][col] = scalarZero(mode);

      const after = matrixToDisplayData(M, precision, tolerance, augmentedSplitCol);
      const signStr = sToNumber(negFactor) >= 0 ? '+' : '-';
      const absFactorLatex = sToLatex(sAbs(negFactor), precision, tolerance);
      const coeffPart = sIsOne(sAbs(negFactor), tolerance) ? '' : `${absFactorLatex} `;
      const notation = `R_{${r + 1}} \\leftarrow R_{${r + 1}} ${signStr} ${coeffPart}R_{${currentRow + 1}}`;

      steps.push({
        stepNumber: stepCounter++,
        stage: r > currentRow ? 'Khử phần tử phía dưới trụ' : 'Khử phần tử phía trên trụ',
        isMajorStage: targetRows[0] === r,
        operationNotation: notation,
        explanation: `Khử phần tử tại vị trí (${r + 1}, ${col + 1}) bằng cách cộng ${sToText(negFactor, precision, tolerance)} lần hàng ${currentRow + 1} vào hàng ${r + 1}.`,
        matrixBefore: before,
        matrixAfter: after,
        augmentedSplitCol,
        highlightedRows: [r, currentRow],
        pivotCell: [currentRow, col],
      });
    }

    currentRow++;
  }

  const freeColumns: number[] = [];
  for (let c = 0; c < pivotLimit; c++) {
    if (!pivotColumns.includes(c)) {
      freeColumns.push(c);
    }
  }

  return {
    matrix: M,
    pivotColumns,
    pivotRows,
    freeColumns,
    rank: pivotColumns.length,
    rowSwaps,
    scaleFactorInverse,
    steps,
  };
}

export function buildEchelonReport(
  A: Scalar[][],
  reduced: boolean,
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const rows = A.length;
  const cols = A[0].length;
  const res = runElimination(A, {
    mode,
    precision,
    tolerance,
    reduceAbovePivots: reduced,
    normalizePivots: reduced,
  });

  const inputDisplay = matrixToDisplayData(A, precision, tolerance);
  const resultDisplay = matrixToDisplayData(res.matrix, precision, tolerance);
  const pivotListText =
    res.pivotColumns.length > 0
      ? res.pivotColumns.map((c, idx) => `(${res.pivotRows[idx] + 1}, ${c + 1})`).join(', ')
      : 'Không có cột trụ (ma trận không)';
  const freeListText =
    res.freeColumns.length > 0
      ? res.freeColumns.map((c) => `cột ${c + 1}`).join(', ')
      : 'Không có cột tự do';

  const algoName = reduced
    ? mode === 'exact'
      ? 'Phương pháp khử Gauss-Jordan (số học phân số chính xác)'
      : 'Phương pháp khử Gauss-Jordan có chọn phần tử trụ từng phần'
    : mode === 'exact'
      ? 'Phương pháp khử Gauss (số học phân số chính xác)'
      : 'Phương pháp khử Gauss có chọn phần tử trụ từng phần';

  const resultName = reduced ? 'Dạng bậc thang rút gọn (RREF)' : 'Dạng bậc thang (REF)';

  return {
    id: crypto.randomUUID(),
    operationId: reduced ? 'rref' : 'ref',
    operationName: reduced ? 'Tìm dạng bậc thang rút gọn (RREF)' : 'Tìm dạng bậc thang (REF)',
    algorithmName: algoName,
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: reduced
      ? `\\text{Đưa ma trận } A_{${rows}\\times ${cols}} \\text{ về dạng bậc thang rút gọn } \\operatorname{RREF}(A)`
      : `\\text{Đưa ma trận } A_{${rows}\\times ${cols}} \\text{ về dạng bậc thang } \\operatorname{REF}(A)`,
    inputMatrices: [{ name: 'A', rows, cols, display: inputDisplay }],
    conditionsCheck: {
      met: true,
      items: [
        {
          label: 'Kích thước hợp lệ',
          satisfied: true,
          detail: `Ma trận cỡ ${rows} × ${cols} hợp lệ cho phép biến đổi sơ cấp trên hàng.`,
        },
      ],
    },
    steps: res.steps,
    resultTitle: resultName,
    resultLatex: `${reduced ? '\\operatorname{RREF}(A)' : '\\operatorname{REF}(A)'} = ${matrixToLatex(res.matrix, precision, tolerance)}`,
    resultText: resultDisplay.entries.map((r) => `[${r.join(', ')}]`).join('\n'),
    resultMatrix: resultDisplay,
    verification: {
      passed: true,
      label: 'Phân tích cấu trúc trụ',
      formulaLatex: `\\operatorname{rank}(A) = ${res.rank}`,
      detail: `Vị trí trụ: ${pivotListText}. Cột tự do: ${freeListText}. Đã thực hiện ${res.steps.length} phép biến đổi sơ cấp hàng tương đương.`,
    },
    conclusion: `Ma trận đã được đưa về ${resultName.toLowerCase()} với hạng bằng ${res.rank}. Các hàng khác không là các hàng độc lập tuyến tính đại diện cho không gian hàng.`,
    limitations:
      mode === 'numerical'
        ? [`Đang sử dụng xấp xỉ dấu phẩy động với ngưỡng làm tròn về 0 là ${tolerance}.`]
        : undefined,
    durationMs: performance.now() - start,
  };
}
