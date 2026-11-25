import {
  CalculationReport,
  CalculationStep,
  ResolvedComputationMode,
  Scalar,
} from '@/src/types/math';
import {
  cloneMatrix,
  createIdentityMatrix,
  createZeroMatrix,
  DEFAULT_PRECISION,
  DEFAULT_TOLERANCE,
  matrixMaxNormDiff,
  matrixToDisplayData,
  matrixToLatex,
  multiplyRawMatrices,
  sAdd,
  scalarFromNumber,
  scalarZero,
  sDiv,
  sIsZero,
  sMul,
  sSub,
  sToLatex,
  sToNumber,
  sToText,
  transposeRawMatrix,
} from '../arithmetic/scalar';

export function computeLURaw(
  A: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): {
  P: Scalar[][];
  L: Scalar[][];
  U: Scalar[][];
  rowSwaps: number;
  steps: CalculationStep[];
  singular: boolean;
} {
  const n = A.length;
  const U = cloneMatrix(A);
  const L = createIdentityMatrix(n, mode);
  const P = createIdentityMatrix(n, mode);
  const steps: CalculationStep[] = [];
  let rowSwaps = 0;
  let stepNo = 1;
  let singular = false;

  for (let k = 0; k < n; k++) {
    // Find pivot
    let pivotRow = -1;
    if (mode === 'numerical') {
      let maxVal = tolerance;
      for (let r = k; r < n; r++) {
        const mag = Math.abs(sToNumber(U[r][k]));
        if (mag > maxVal) {
          maxVal = mag;
          pivotRow = r;
        }
      }
    } else {
      for (let r = k; r < n; r++) {
        if (!sIsZero(U[r][k], tolerance)) {
          pivotRow = r;
          break;
        }
      }
    }

    if (pivotRow === -1) {
      singular = true;
      continue;
    }

    if (pivotRow !== k) {
      // Swap rows in U and P
      [U[k], U[pivotRow]] = [U[pivotRow], U[k]];
      [P[k], P[pivotRow]] = [P[pivotRow], P[k]];
      // Swap already computed columns of L (< k)
      for (let j = 0; j < k; j++) {
        const tmp = L[k][j];
        L[k][j] = L[pivotRow][j];
        L[pivotRow][j] = tmp;
      }
      rowSwaps++;
      steps.push({
        stepNumber: stepNo++,
        stage: 'Hoán đổi hàng chọn phần tử trụ',
        isMajorStage: true,
        operationNotation: `P: R_{${k + 1}} \\leftrightarrow R_{${pivotRow + 1}}`,
        explanation: `Hoán đổi hàng ${k + 1} và hàng ${pivotRow + 1} trong ma trận U và ma trận hoán vị P (đồng thời cập nhật các nhân tử dưới đường chéo của L).`,
        matrixAfter: matrixToDisplayData(U, precision, tolerance),
        highlightedRows: [k, pivotRow],
        pivotCell: [k, k],
      });
    }

    for (let i = k + 1; i < n; i++) {
      if (sIsZero(U[i][k], tolerance)) continue;
      const factor = sDiv(U[i][k], U[k][k]);
      L[i][k] = factor;
      for (let j = k; j < n; j++) {
        const updated = sSub(U[i][j], sMul(factor, U[k][j]));
        U[i][j] = sIsZero(updated, tolerance) ? scalarZero(mode) : updated;
      }
      U[i][k] = scalarZero(mode);
      steps.push({
        stepNumber: stepNo++,
        stage: `Tính nhân tử L_{${i + 1},${k + 1}} và khử hàng ${i + 1}`,
        isMajorStage: false,
        operationNotation: `L_{${i + 1},${k + 1}} = ${sToLatex(factor, precision, tolerance)},\\quad R_{${i + 1}} \\leftarrow R_{${i + 1}} - (${sToLatex(factor, precision, tolerance)})R_{${k + 1}}`,
        explanation: `Lưu hệ số nhân tử l_{${i + 1},${k + 1}} = ${sToText(factor, precision, tolerance)} vào L và khử U_{${i + 1},${k + 1}} về 0.`,
        matrixAfter: matrixToDisplayData(U, precision, tolerance),
        highlightedRows: [i, k],
        pivotCell: [k, k],
      });
    }
  }

  return { P, L, U, rowSwaps, steps, singular };
}

export function buildLUReport(
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
      operationId: 'lu',
      operationName: 'Phân tích LU (PA = LU)',
      algorithmName: 'Phân tích Doolittle có chọn trụ từng phần',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: 'PA = LU',
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [
          {
            label: 'Ma trận vuông',
            satisfied: false,
            detail: `Ma trận có cỡ ${rows} × ${cols}. Phiên bản phân tích PA = LU chuẩn yêu cầu ma trận vuông.`,
          },
        ],
      },
      steps: [],
      resultTitle: 'Không thể phân tích LU',
      resultLatex: '\\text{Yêu cầu ma trận vuông}',
      resultText: 'Phân tích PA = LU yêu cầu ma trận vuông.',
      conclusion: 'Không thể thực hiện phân tích LU cho ma trận không vuông.',
      durationMs: performance.now() - start,
    };
  }

  const lu = computeLURaw(A, mode, precision, tolerance);
  const PA = multiplyRawMatrices(lu.P, A);
  const LU = multiplyRawMatrices(lu.L, lu.U);
  const residual = matrixMaxNormDiff(PA, LU);
  const verified = mode === 'exact' ? residual === 0 : residual <= Math.max(tolerance * 100, 1e-7);

  const dispP = matrixToDisplayData(lu.P, precision, tolerance);
  const dispL = matrixToDisplayData(lu.L, precision, tolerance);
  const dispU = matrixToDisplayData(lu.U, precision, tolerance);

  return {
    id: crypto.randomUUID(),
    operationId: 'lu',
    operationName: 'Phân tích LU (PA = LU)',
    algorithmName:
      mode === 'exact'
        ? 'Phân tích Doolittle với hoán vị hàng PA = LU (số học phân số chính xác)'
        : 'Phân tích Doolittle với chọn trụ từng phần PA = LU',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: 'PA = LU',
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [
        { label: 'Ma trận vuông', satisfied: true, detail: `A là ma trận vuông cấp ${rows}.` },
        {
          label: 'Hoán vị hàng đảm bảo tồn tại phân tích',
          satisfied: true,
          detail:
            lu.rowSwaps > 0
              ? `Đã thực hiện ${lu.rowSwaps} phép hoán vị hàng (ma trận P ≠ I).`
              : 'Không cần hoán vị hàng (P = I, tức A = LU trực tiếp).',
        },
      ],
    },
    steps: lu.steps,
    resultTitle: lu.rowSwaps === 0 ? 'Phân tích A = LU' : 'Phân tích PA = LU',
    resultLatex: `L = ${matrixToLatex(lu.L, precision, tolerance)},\\quad U = ${matrixToLatex(lu.U, precision, tolerance)}`,
    resultText: `P, L, U đã được tính với ||PA - LU||_∞ = ${residual.toExponential(2)}.`,
    secondaryMatrices: [
      { label: 'Ma trận hoán vị P', symbol: 'P', matrix: dispP },
      { label: 'Ma trận tam giác dưới đơn vị L', symbol: 'L', matrix: dispL },
      { label: 'Ma trận tam giác trên U', symbol: 'U', matrix: dispU },
    ],
    verification: {
      passed: verified,
      label: 'Kiểm chứng tích PA = LU',
      formulaLatex: mode === 'exact' ? 'PA = LU' : `\\|PA - LU\\|_\\infty = ${residual.toExponential(2)}`,
      residualNorm: residual,
      detail: `Sai số cực đại giữa PA và LU là ${residual.toExponential(2)}.`,
    },
    conclusion: lu.singular
      ? `Phân tích PA = LU hoàn tất; lưu ý ma trận A suy biến (có phần tử 0 trên đường chéo U).`
      : `Phân tích PA = LU hoàn tất và được kiểm chứng chính xác.`,
    durationMs: performance.now() - start,
  };
}

export function buildQRReport(
  A: Scalar[][],
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const m = A.length;
  const n = A[0].length;
  const dispA = matrixToDisplayData(A, precision, tolerance);

  if (m < n) {
    return {
      id: crypto.randomUUID(),
      operationId: 'qr',
      operationName: 'Phân tích QR (A = QR)',
      algorithmName: 'Quá trình trực chuẩn hóa Gram-Schmidt cải tiến (Modified Gram-Schmidt)',
      modeUsed: 'numerical',
      isExactResult: false,
      problemStatementLatex: 'A = QR',
      inputMatrices: [{ name: 'A', rows: m, cols: n, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [
          {
            label: 'Số hàng ≥ số cột (m ≥ n)',
            satisfied: false,
            detail: `Ma trận có cỡ ${m} × ${n} (m < n), các cột chắc chắn phụ thuộc tuyến tính nên không thể trực chuẩn hóa thành Q cỡ ${m} × ${n} có hạng cột đầy đủ.`,
          },
        ],
      },
      steps: [],
      resultTitle: 'Không thỏa mãn điều kiện phân tích QR rút gọn',
      resultLatex: '\\text{Yêu cầu } m \\ge n \\text{ và các cột độc lập tuyến tính}',
      resultText: 'Cần m ≥ n và các cột độc lập tuyến tính.',
      conclusion: `Phân tích QR (dạng rút gọn) yêu cầu m ≥ n. Hãy kiểm tra ma trận có m ≥ n với các cột độc lập tuyến tính.`,
      durationMs: performance.now() - start,
    };
  }

  // Modified Gram-Schmidt in floating-point
  const Qnum: number[][] = Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (__, j) => sToNumber(A[i][j]))
  );
  const Rnum: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const steps: CalculationStep[] = [];
  let dependentCol = -1;

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < j; i++) {
      let dot = 0;
      for (let r = 0; r < m; r++) {
        dot += Qnum[r][i] * Qnum[r][j];
      }
      Rnum[i][j] = dot;
      for (let r = 0; r < m; r++) {
        Qnum[r][j] -= dot * Qnum[r][i];
      }
    }
    let normSq = 0;
    for (let r = 0; r < m; r++) {
      normSq += Qnum[r][j] * Qnum[r][j];
    }
    const norm = Math.sqrt(normSq);
    if (norm <= tolerance) {
      dependentCol = j;
      break;
    }
    Rnum[j][j] = norm;
    for (let r = 0; r < m; r++) {
      Qnum[r][j] /= norm;
    }

    steps.push({
      stepNumber: steps.length + 1,
      stage: `Trực chuẩn hóa cột ${j + 1}`,
      isMajorStage: true,
      operationNotation: `q_{${j + 1}} = \\frac{u_{${j + 1}}}{\\|u_{${j + 1}}\\|_2},\\quad R_{${j + 1},${j + 1}} = ${norm.toFixed(precision)}`,
      explanation: `Trừ các hình chiếu trực giao của cột ${j + 1} lên q₁, ..., q_${j} và chuẩn hóa về độ dài 1 (chuẩn Euclid = ${norm.toFixed(precision)}).`,
    });
  }

  if (dependentCol !== -1) {
    return {
      id: crypto.randomUUID(),
      operationId: 'qr',
      operationName: 'Phân tích QR (A = QR)',
      algorithmName: 'Gram-Schmidt cải tiến (xấp xỉ số học dấu phẩy động)',
      modeUsed: 'numerical',
      isExactResult: false,
      problemStatementLatex: 'A = QR',
      inputMatrices: [{ name: 'A', rows: m, cols: n, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [
          { label: 'm ≥ n', satisfied: true, detail: `m = ${m} ≥ n = ${n}.` },
          {
            label: 'Các cột của A độc lập tuyến tính',
            satisfied: false,
            detail: `Cột ${dependentCol + 1} phụ thuộc tuyến tính vào các cột trước đó (chuẩn phần dư ≈ 0).`,
          },
        ],
      },
      steps,
      resultTitle: 'Các cột phụ thuộc tuyến tính',
      resultLatex: '\\text{Không tồn tại phân tích QR đầy đủ hạng cột}',
      resultText: `Cột ${dependentCol + 1} là tổ hợp tuyến tính của các cột trước.`,
      conclusion: `Không thể hoàn tất phân tích QR rút gọn do cột ${dependentCol + 1} phụ thuộc tuyến tính vào các cột trước.`,
      durationMs: performance.now() - start,
    };
  }

  const Q: Scalar[][] = Qnum.map((row) => row.map((v) => scalarFromNumber(v)));
  const R: Scalar[][] = Rnum.map((row) => row.map((v) => scalarFromNumber(v)));
  const QR = multiplyRawMatrices(Q, R);
  const QTQ = multiplyRawMatrices(transposeRawMatrix(Q), Q);
  const In = createIdentityMatrix(n, 'numerical');
  const reconErr = matrixMaxNormDiff(QR, A);
  const orthoErr = matrixMaxNormDiff(QTQ, In);
  const maxErr = Math.max(reconErr, orthoErr);

  const dispQ = matrixToDisplayData(Q, precision, tolerance);
  const dispR = matrixToDisplayData(R, precision, tolerance);

  return {
    id: crypto.randomUUID(),
    operationId: 'qr',
    operationName: 'Phân tích QR (A = QR)',
    algorithmName: 'Gram-Schmidt cải tiến (Modified Gram-Schmidt — xấp xỉ số học)',
    modeUsed: 'numerical',
    isExactResult: false,
    problemStatementLatex: 'A = QR',
    inputMatrices: [{ name: 'A', rows: m, cols: n, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [
        { label: 'm ≥ n', satisfied: true, detail: `m = ${m} ≥ n = ${n}.` },
        { label: 'Các cột độc lập tuyến tính', satisfied: true, detail: 'Toàn bộ n cột có chuẩn khác 0 sau trực giao hóa.' },
      ],
    },
    steps,
    resultTitle: 'Phân tích A = QR',
    resultLatex: `Q = ${matrixToLatex(Q, precision, tolerance)},\\quad R = ${matrixToLatex(R, precision, tolerance)}`,
    resultText: `||A - QR||_∞ = ${reconErr.toExponential(2)}, ||Q^T Q - I||_∞ = ${orthoErr.toExponential(2)}`,
    secondaryMatrices: [
      { label: 'Ma trận có các cột trực chuẩn Q', symbol: 'Q', matrix: dispQ },
      { label: 'Ma trận tam giác trên R', symbol: 'R', matrix: dispR },
    ],
    verification: {
      passed: maxErr <= 1e-6,
      label: 'Kiểm chứng tái tạo A = QR và tính trực chuẩn Q^T Q = I',
      formulaLatex: `\\|A - QR\\|_\\infty = ${reconErr.toExponential(2)},\\quad \\|Q^T Q - I_{${n}}\\|_\\infty = ${orthoErr.toExponential(2)}`,
      residualNorm: maxErr,
      detail: `Sai số tái tạo ${reconErr.toExponential(2)}, sai số trực chuẩn ${orthoErr.toExponential(2)}.`,
    },
    conclusion: 'Phân tích A = QR hoàn tất bằng phương pháp Gram-Schmidt cải tiến.',
    limitations: [
      'Phép chuẩn hóa chia cho căn bậc hai ||u||₂ tạo giá trị vô tỉ, nên phân tích QR sử dụng số học dấu phẩy động (xấp xỉ số học).',
    ],
    durationMs: performance.now() - start,
  };
}

export function computeCholeskyRaw(
  A: Scalar[][],
  tolerance: number = DEFAULT_TOLERANCE
): { success: boolean; L?: number[][]; reason?: string; steps: CalculationStep[] } {
  const n = A.length;
  if (n !== A[0].length) {
    return { success: false, reason: 'Ma trận không vuông.', steps: [] };
  }
  const Anum = A.map((row) => row.map((v) => sToNumber(v)));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(Anum[i][j] - Anum[j][i]) > tolerance) {
        return {
          success: false,
          reason: `Ma trận không đối xứng tại cặp (${i + 1}, ${j + 1}): ${Anum[i][j]} ≠ ${Anum[j][i]}.`,
          steps: [],
        };
      }
    }
  }

  const L: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const steps: CalculationStep[] = [];

  for (let i = 0; i < n; i++) {
    let diagSum = 0;
    for (let k = 0; k < i; k++) {
      diagSum += L[i][k] * L[i][k];
    }
    const diagInner = Anum[i][i] - diagSum;
    if (diagInner <= tolerance) {
      return {
        success: false,
        reason: `Tại bước i = ${i + 1}, biểu thức dưới dấu căn L_{${i + 1},${i + 1}}^2 = ${diagInner.toExponential(4)} ≤ 0. Ma trận không xác định dương.`,
        steps,
      };
    }
    L[i][i] = Math.sqrt(diagInner);

    for (let j = i + 1; j < n; j++) {
      let offSum = 0;
      for (let k = 0; k < i; k++) {
        offSum += L[j][k] * L[i][k];
      }
      L[j][i] = (Anum[j][i] - offSum) / L[i][i];
    }

    steps.push({
      stepNumber: steps.length + 1,
      stage: `Tính cột ${i + 1} của ma trận L`,
      isMajorStage: true,
      operationNotation: `L_{${i + 1},${i + 1}} = \\sqrt{${diagInner.toFixed(4)}} = ${L[i][i].toFixed(4)}`,
      explanation: `Tính phần tử đường chéo L_{${i + 1},${i + 1}} > 0 và các phần tử phía dưới trong cột ${i + 1}.`,
    });
  }

  return { success: true, L, steps };
}

export function buildCholeskyReport(
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
      operationId: 'cholesky',
      operationName: 'Phân tích Cholesky (A = LL^T)',
      algorithmName: 'Thuật toán Cholesky-Banachiewicz',
      modeUsed: 'numerical',
      isExactResult: false,
      problemStatementLatex: 'A = L L^T',
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [{ label: 'Ma trận vuông', satisfied: false, detail: `A cỡ ${rows} × ${cols} không vuông.` }],
      },
      steps: [],
      resultTitle: 'Không thể phân tích Cholesky',
      resultLatex: '\\text{Yêu cầu ma trận vuông đối xứng xác định dương}',
      resultText: 'Phân tích Cholesky yêu cầu ma trận vuông đối xứng xác định dương.',
      conclusion: 'Ma trận không vuông nên không có phân tích Cholesky.',
      durationMs: performance.now() - start,
    };
  }

  const chol = computeCholeskyRaw(A, tolerance);
  if (!chol.success || !chol.L) {
    return {
      id: crypto.randomUUID(),
      operationId: 'cholesky',
      operationName: 'Phân tích Cholesky (A = LL^T)',
      algorithmName: 'Thuật toán Cholesky (xấp xỉ số học)',
      modeUsed: 'numerical',
      isExactResult: false,
      problemStatementLatex: 'A = L L^T',
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: false,
        items: [
          { label: 'Ma trận vuông', satisfied: true, detail: `A vuông cấp ${rows}.` },
          {
            label: 'Đối xứng và xác định dương',
            satisfied: false,
            detail: chol.reason ?? 'Không thỏa mãn điều kiện đối xứng xác định dương.',
          },
        ],
      },
      steps: chol.steps,
      resultTitle: 'Không tồn tại phân tích Cholesky thực',
      resultLatex: '\\text{Không thỏa mãn } A^T = A \\text{ và } A \\succ 0',
      resultText: chol.reason ?? 'Ma trận không đối xứng xác định dương.',
      conclusion: chol.reason ?? 'Không thể phân tích Cholesky vì ma trận không đối xứng xác định dương.',
      durationMs: performance.now() - start,
    };
  }

  const LScalar: Scalar[][] = chol.L.map((row) => row.map((v) => scalarFromNumber(v)));
  const LTScalar = transposeRawMatrix(LScalar);
  const recon = multiplyRawMatrices(LScalar, LTScalar);
  const residual = matrixMaxNormDiff(recon, A);

  const dispL = matrixToDisplayData(LScalar, precision, tolerance);
  const dispLT = matrixToDisplayData(LTScalar, precision, tolerance);

  return {
    id: crypto.randomUUID(),
    operationId: 'cholesky',
    operationName: 'Phân tích Cholesky (A = LL^T)',
    algorithmName: 'Thuật toán Cholesky (xấp xỉ số học dấu phẩy động)',
    modeUsed: 'numerical',
    isExactResult: false,
    problemStatementLatex: 'A = L L^T',
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    conditionsCheck: {
      met: true,
      items: [
        { label: 'Ma trận vuông', satisfied: true, detail: `A vuông cấp ${rows}.` },
        { label: 'Đối xứng xác định dương', satisfied: true, detail: 'Mọi phần tử đường chéo L_{ii} > 0.' },
      ],
    },
    steps: chol.steps,
    resultTitle: 'Phân tích Cholesky A = LL^T',
    resultLatex: `L = ${matrixToLatex(LScalar, precision, tolerance)}`,
    resultText: `||L L^T - A||_∞ = ${residual.toExponential(2)}`,
    resultMatrix: dispL,
    secondaryMatrices: [{ label: 'Chuyển vị L^T', symbol: 'L^T', matrix: dispLT }],
    verification: {
      passed: residual <= 1e-6,
      label: 'Kiểm chứng tích LL^T = A',
      formulaLatex: `\\|L L^T - A\\|_\\infty = ${residual.toExponential(2)}`,
      residualNorm: residual,
      detail: `Sai số tái tạo cực đại giữa L·L^T và A là ${residual.toExponential(2)}.`,
    },
    conclusion: 'Ma trận A đối xứng xác định dương và đã được phân tích thành A = LL^T.',
    limitations: [
      'Phân tích Cholesky sử dụng phép khai căn bậc hai nên kết quả được biểu diễn ở chế độ xấp xỉ số học.',
    ],
    durationMs: performance.now() - start,
  };
}

// Keep unused imports clean
export { createZeroMatrix, sAdd };
