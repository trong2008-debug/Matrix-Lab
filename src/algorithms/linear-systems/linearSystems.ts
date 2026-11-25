import {
  CalculationReport,
  CalculationStep,
  LinearSystemMethod,
  ResolvedComputationMode,
  Scalar,
} from '@/src/types/math';
import {
  cloneMatrix,
  DEFAULT_PRECISION,
  DEFAULT_TOLERANCE,
  matrixMaxNormDiff,
  matrixToDisplayData,
  matrixToLatex,
  multiplyRawMatrices,
  sAdd,
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
import { computeDeterminantScalar } from '../determinant/determinant';
import { runElimination } from '../elimination/echelon';
import { computeInverseRaw } from '../inverse/inverse';

function formatLinearCombinationTerm(coeff: Scalar, varSymbol: string, isFirst: boolean, precision: number, tol: number): string {
  const neg = sToNumber(coeff) < 0;
  const absCoeff = neg ? sNeg(coeff) : coeff;
  const coeffLatex = sIsOne(absCoeff, tol) ? '' : sToLatex(absCoeff, precision, tol);
  if (isFirst) {
    return `${neg ? '-' : ''}${coeffLatex}${varSymbol}`;
  }
  return `${neg ? ' - ' : ' + '}${coeffLatex}${varSymbol}`;
}

export function buildLinearSystemReport(
  A: Scalar[][],
  B: Scalar[][],
  method: LinearSystemMethod,
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const m = A.length;
  const n = A[0].length;
  const mB = B.length;
  const k = B[0].length;
  const dispA = matrixToDisplayData(A, precision, tolerance);
  const dispB = matrixToDisplayData(B, precision, tolerance);

  if (m !== mB) {
    return {
      id: crypto.randomUUID(),
      operationId: 'linear-system',
      operationName: 'Giải hệ phương trình tuyến tính (AX = B)',
      algorithmName: 'Kiểm tra kích thước hệ phương trình',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: 'AX = B',
      inputMatrices: [
        { name: 'A', rows: m, cols: n, display: dispA },
        { name: 'B', rows: mB, cols: k, display: dispB },
      ],
      conditionsCheck: {
        met: false,
        items: [
          {
            label: 'Số phương trình khớp nhau',
            satisfied: false,
            detail: `Ma trận hệ số A có ${m} hàng, nhưng vế phải B có ${mB} hàng.`,
          },
        ],
      },
      steps: [],
      resultTitle: 'Kích thước không tương thích',
      resultLatex: '\\text{Không xác định (số hàng A và B khác nhau)}',
      resultText: 'Số hàng của A phải bằng số hàng của B.',
      conclusion: `Không thể giải hệ AX = B do A có ${m} phương trình nhưng B có ${mB} hàng.`,
      durationMs: performance.now() - start,
    };
  }

  // Method-specific prechecks for Cramer & Inverse
  if (method === 'cramer') {
    if (m !== n || k !== 1) {
      return {
        id: crypto.randomUUID(),
        operationId: 'linear-system',
        operationName: 'Giải hệ phương trình tuyến tính bằng quy tắc Cramer',
        algorithmName: 'Quy tắc Cramer',
        modeUsed: mode,
        isExactResult: mode === 'exact',
        problemStatementLatex: 'Ax = b',
        inputMatrices: [
          { name: 'A', rows: m, cols: n, display: dispA },
          { name: 'b', rows: mB, cols: k, display: dispB },
        ],
        conditionsCheck: {
          met: false,
          items: [
            {
              label: 'Ma trận hệ số vuông (m = n)',
              satisfied: m === n,
              detail: `A có cỡ ${m} × ${n}. Quy tắc Cramer yêu cầu số phương trình bằng số ẩn.`,
            },
            {
              label: 'Vế phải là 1 vector cột (k = 1)',
              satisfied: k === 1,
              detail: `B đang có ${k} cột.`,
            },
          ],
        },
        steps: [],
        resultTitle: 'Không áp dụng được quy tắc Cramer',
        resultLatex: '\\text{Không thỏa mãn điều kiện áp dụng Cramer}',
        resultText: 'Quy tắc Cramer yêu cầu A vuông và B có 1 cột.',
        conclusion: 'Hãy chọn phương pháp Khử Gauss hoặc Gauss-Jordan cho hệ tổng quát này.',
        durationMs: performance.now() - start,
      };
    }

    const detA = computeDeterminantScalar(A, mode, tolerance);
    if (sIsZero(detA, tolerance)) {
      return {
        id: crypto.randomUUID(),
        operationId: 'linear-system',
        operationName: 'Giải hệ phương trình tuyến tính bằng quy tắc Cramer',
        algorithmName: 'Quy tắc Cramer',
        modeUsed: mode,
        isExactResult: mode === 'exact',
        problemStatementLatex: 'Ax = b',
        inputMatrices: [
          { name: 'A', rows: m, cols: n, display: dispA },
          { name: 'b', rows: mB, cols: k, display: dispB },
        ],
        conditionsCheck: {
          met: false,
          items: [
            { label: 'Ma trận hệ số vuông', satisfied: true, detail: `A vuông cấp ${n}.` },
            {
              label: 'Định thức det(A) ≠ 0',
              satisfied: false,
              detail: `det(A) = 0 nên hệ không có nghiệm duy nhất; quy tắc Cramer không áp dụng được.`,
            },
          ],
        },
        steps: [],
        resultTitle: 'Không áp dụng được quy tắc Cramer (det A = 0)',
        resultLatex: '\\det(A) = 0 \\implies \\text{Không áp dụng được quy tắc Cramer}',
        resultText: 'det(A) = 0. Hãy dùng khử Gauss để biện luận vô nghiệm hay vô số nghiệm.',
        conclusion: 'Vì det(A) = 0, quy tắc Cramer không dùng được. Vui lòng chuyển sang Khử Gauss hoặc Gauss-Jordan để biện luận tập nghiệm.',
        durationMs: performance.now() - start,
      };
    }

    const steps: CalculationStep[] = [
      {
        stepNumber: 1,
        stage: 'Tính định thức ma trận hệ số A',
        isMajorStage: true,
        operationNotation: `\\det(A) = ${sToLatex(detA, precision, tolerance)} \\neq 0`,
        explanation: `Vì det(A) = ${sToText(detA, precision, tolerance)} ≠ 0, hệ có nghiệm duy nhất xác định bởi x_i = det(A_i) / det(A).`,
      },
    ];

    const solCol: Scalar[] = [];
    const solLatexParts: string[] = [];
    const solTextParts: string[] = [];

    for (let colIdx = 0; colIdx < n; colIdx++) {
      const Ai = cloneMatrix(A);
      for (let r = 0; r < n; r++) {
        Ai[r][colIdx] = B[r][0];
      }
      const detAi = computeDeterminantScalar(Ai, mode, tolerance);
      const xi = sDiv(detAi, detA);
      solCol.push(xi);
      solLatexParts.push(`x_{${colIdx + 1}} = ${sToLatex(xi, precision, tolerance)}`);
      solTextParts.push(`x_${colIdx + 1} = ${sToText(xi, precision, tolerance)}`);

      steps.push({
        stepNumber: steps.length + 1,
        stage: `Thay cột ${colIdx + 1} bởi b và tính x_{${colIdx + 1}}`,
        isMajorStage: true,
        operationNotation: `x_{${colIdx + 1}} = \\frac{\\det(A_{${colIdx + 1}})}{\\det(A)} = \\frac{${sToLatex(detAi, precision, tolerance)}}{${sToLatex(detA, precision, tolerance)}} = ${sToLatex(xi, precision, tolerance)}`,
        explanation: `Thay cột ${colIdx + 1} của A bằng vectơ vế phải b để tạo A_${colIdx + 1}, thu được det(A_${colIdx + 1}) = ${sToText(detAi, precision, tolerance)}.`,
        matrixAfter: matrixToDisplayData(Ai, precision, tolerance),
      });
    }

    const X = solCol.map((v) => [v]);
    const AX = multiplyRawMatrices(A, X);
    const residual = matrixMaxNormDiff(AX, B);

    return {
      id: crypto.randomUUID(),
      operationId: 'linear-system',
      operationName: 'Giải hệ phương trình tuyến tính bằng quy tắc Cramer',
      algorithmName:
        mode === 'exact'
          ? 'Quy tắc Cramer (số học phân số chính xác)'
          : 'Quy tắc Cramer (định thức khử Gauss dấu phẩy động)',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: 'Ax = b',
      inputMatrices: [
        { name: 'A', rows: m, cols: n, display: dispA },
        { name: 'b', rows: mB, cols: k, display: dispB },
      ],
      conditionsCheck: {
        met: true,
        items: [
          { label: 'Ma trận hệ số vuông', satisfied: true, detail: `A vuông cấp ${n}.` },
          { label: 'det(A) ≠ 0', satisfied: true, detail: `det(A) = ${sToText(detA, precision, tolerance)} ≠ 0.` },
        ],
      },
      steps,
      resultTitle: 'Hệ có nghiệm duy nhất',
      resultLatex: `\\begin{cases} ${solLatexParts.join(' \\\\ ')} \\end{cases}`,
      resultText: solTextParts.join('\n'),
      resultMatrix: matrixToDisplayData(X, precision, tolerance),
      verification: {
        passed: mode === 'exact' ? residual === 0 : residual <= Math.max(tolerance * 100, 1e-7),
        label: 'Kiểm tra lại Ax = b',
        formulaLatex:
          mode === 'exact'
            ? 'A x = b \\; (\\text{đúng tuyệt đối})'
            : `\\|Ax - b\\|_\\infty = ${residual.toExponential(2)}`,
        residualNorm: residual,
        detail: `Thay nghiệm vào hệ ban đầu cho sai số dư ${residual.toExponential(2)}.`,
      },
      conclusion: `Hệ phương trình có nghiệm duy nhất: (${solCol.map((v) => sToText(v, precision, tolerance)).join(', ')}).`,
      durationMs: performance.now() - start,
    };
  }

  if (method === 'inverse') {
    if (m !== n) {
      return {
        id: crypto.randomUUID(),
        operationId: 'linear-system',
        operationName: 'Giải hệ bằng ma trận nghịch đảo (X = A^{-1}B)',
        algorithmName: 'Phương pháp ma trận nghịch đảo',
        modeUsed: mode,
        isExactResult: mode === 'exact',
        problemStatementLatex: 'X = A^{-1}B',
        inputMatrices: [
          { name: 'A', rows: m, cols: n, display: dispA },
          { name: 'B', rows: mB, cols: k, display: dispB },
        ],
        conditionsCheck: {
          met: false,
          items: [
            {
              label: 'Ma trận hệ số vuông',
              satisfied: false,
              detail: `A có cỡ ${m} × ${n}, không phải ma trận vuông nên không có A^{-1}.`,
            },
          ],
        },
        steps: [],
        resultTitle: 'Không áp dụng được phương pháp nghịch đảo',
        resultLatex: '\\text{Không xác định (A không vuông)}',
        resultText: 'Phương pháp X = A^{-1}B chỉ áp dụng khi A vuông khả nghịch.',
        conclusion: 'Vui lòng chọn phương pháp Khử Gauss hoặc Gauss-Jordan cho ma trận không vuông.',
        durationMs: performance.now() - start,
      };
    }

    const inv = computeInverseRaw(A, mode, precision, tolerance);
    if (!inv.invertible || !inv.inverse) {
      return {
        id: crypto.randomUUID(),
        operationId: 'linear-system',
        operationName: 'Giải hệ bằng ma trận nghịch đảo (X = A^{-1}B)',
        algorithmName: 'Phương pháp ma trận nghịch đảo',
        modeUsed: mode,
        isExactResult: mode === 'exact',
        problemStatementLatex: 'X = A^{-1}B',
        inputMatrices: [
          { name: 'A', rows: m, cols: n, display: dispA },
          { name: 'B', rows: mB, cols: k, display: dispB },
        ],
        conditionsCheck: {
          met: false,
          items: [
            { label: 'Ma trận vuông', satisfied: true, detail: `A vuông cấp ${n}.` },
            {
              label: 'Ma trận A khả nghịch',
              satisfied: false,
              detail: 'A suy biến (det(A) = 0), không tồn tại A^{-1}. Hãy dùng Khử Gauss để biện luận nghiệm.',
            },
          ],
        },
        steps: inv.steps,
        resultTitle: 'Không áp dụng được phương pháp nghịch đảo',
        resultLatex: '\\nexists\\, A^{-1} \\quad (\\text{A suy biến})',
        resultText: 'A không khả nghịch. Hãy dùng Khử Gauss để kiểm tra vô nghiệm hay vô số nghiệm.',
        conclusion: 'Ma trận A suy biến nên không thể dùng công thức X = A^{-1}B.',
        durationMs: performance.now() - start,
      };
    }

    const X = multiplyRawMatrices(inv.inverse, B);
    const AX = multiplyRawMatrices(A, X);
    const residual = matrixMaxNormDiff(AX, B);
    const dispX = matrixToDisplayData(X, precision, tolerance);

    const steps: CalculationStep[] = [
      ...inv.steps,
      {
        stepNumber: inv.steps.length + 1,
        stage: 'Nhân X = A^{-1} B',
        isMajorStage: true,
        operationNotation: 'X = A^{-1} B',
        explanation: 'Sau khi tìm được A^{-1} bằng Gauss-Jordan, nhân A^{-1} với B để thu được nghiệm X.',
        matrixBefore: matrixToDisplayData(inv.inverse, precision, tolerance),
        matrixAfter: dispX,
      },
    ];

    const solEntries = X.map((row, idx) =>
      k === 1
        ? `x_{${idx + 1}} = ${sToLatex(row[0], precision, tolerance)}`
        : `x_{${idx + 1}} = (${row.map((v) => sToLatex(v, precision, tolerance)).join(', ')})`
    );

    return {
      id: crypto.randomUUID(),
      operationId: 'linear-system',
      operationName: 'Giải hệ phương trình tuyến tính bằng ma trận nghịch đảo',
      algorithmName:
        mode === 'exact'
          ? 'Nghịch đảo Gauss-Jordan + Nhân X = A^{-1}B (phân số chính xác)'
          : 'Nghịch đảo Gauss-Jordan + Nhân X = A^{-1}B',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: 'X = A^{-1}B',
      inputMatrices: [
        { name: 'A', rows: m, cols: n, display: dispA },
        { name: 'B', rows: mB, cols: k, display: dispB },
      ],
      conditionsCheck: {
        met: true,
        items: [
          { label: 'Ma trận vuông', satisfied: true, detail: `A vuông cấp ${n}.` },
          { label: 'A khả nghịch', satisfied: true, detail: 'Tồn tại A^{-1}.' },
        ],
      },
      steps,
      resultTitle: 'Hệ có nghiệm duy nhất',
      resultLatex: k === 1 ? `\\begin{cases} ${solEntries.join(' \\\\ ')} \\end{cases}` : `X = ${matrixToLatex(X, precision, tolerance)}`,
      resultText: dispX.entries.map((r) => `[${r.join(', ')}]`).join('\n'),
      resultMatrix: dispX,
      secondaryMatrices: [
        { label: 'Ma trận nghịch đảo A^{-1}', symbol: 'A^{-1}', matrix: matrixToDisplayData(inv.inverse, precision, tolerance) },
      ],
      verification: {
        passed: mode === 'exact' ? residual === 0 : residual <= Math.max(tolerance * 100, 1e-7),
        label: 'Kiểm tra AX = B',
        formulaLatex: mode === 'exact' ? 'AX = B' : `\\|AX - B\\|_\\infty = ${residual.toExponential(2)}`,
        residualNorm: residual,
        detail: `Kiểm chứng trực tiếp AX = B cho sai số ${residual.toExponential(2)}.`,
      },
      conclusion: 'Hệ có nghiệm duy nhất được tìm bằng công thức X = A^{-1}B.',
      durationMs: performance.now() - start,
    };
  }

  // Gaussian or Gauss-Jordan elimination on [A | B]
  const isGaussJordan = method === 'gauss-jordan';
  const augmentedStart = A.map((row, idx) => [...row, ...B[idx]]);
  const initStep: CalculationStep = {
    stepNumber: 1,
    stage: 'Lập ma trận mở rộng [A | B]',
    isMajorStage: true,
    operationNotation: '[A \\mid B]',
    explanation: `Ghép ma trận hệ số A (${m} × ${n}) và ma trận vế phải B (${m} × ${k}) thành ma trận mở rộng.`,
    matrixAfter: matrixToDisplayData(augmentedStart, precision, tolerance, n),
    augmentedSplitCol: n,
  };

  // Run elimination on coefficient columns (maxPivotCol = n)
  const elim = runElimination(augmentedStart, {
    mode,
    precision,
    tolerance,
    maxPivotCol: n,
    augmentedSplitCol: n,
    reduceAbovePivots: isGaussJordan,
    normalizePivots: isGaussJordan,
  });

  const steps: CalculationStep[] = [initStep, ...elim.steps.map((s) => ({ ...s, stepNumber: s.stepNumber + 1 }))];

  const rankA = elim.rank;

  // Check inconsistency: any row >= rankA has nonzero entry in B columns
  let inconsistentRow = -1;
  let inconsistentCol = -1;
  for (let r = rankA; r < m; r++) {
    for (let c = n; c < n + k; c++) {
      if (!sIsZero(elim.matrix[r][c], tolerance)) {
        inconsistentRow = r;
        inconsistentCol = c - n;
        break;
      }
    }
    if (inconsistentRow !== -1) break;
  }

  const rankAug = inconsistentRow !== -1 ? rankA + 1 : rankA; // Wait: if k > 1, rank([A|B]) >= rank(A) + 1; exact rank([A|B]) computed for display:
  const augFullElim = runElimination(augmentedStart, {
    mode,
    precision,
    tolerance,
    reduceAbovePivots: false,
    normalizePivots: false,
  });
  const exactRankAug = augFullElim.rank;

  const algoName = isGaussJordan
    ? mode === 'exact'
      ? 'Phương pháp Gauss-Jordan (số học phân số chính xác)'
      : 'Phương pháp Gauss-Jordan có chọn trụ từng phần'
    : mode === 'exact'
      ? 'Phương pháp khử Gauss và thế ngược (số học phân số chính xác)'
      : 'Phương pháp khử Gauss có chọn trụ từng phần và thế ngược';

  if (inconsistentRow !== -1) {
    const rhsVal = elim.matrix[inconsistentRow][n + inconsistentCol];
    steps.push({
      stepNumber: steps.length + 1,
      stage: 'Phát hiện hàng mâu thuẫn',
      isMajorStage: true,
      operationNotation: `0 = ${sToLatex(rhsVal, precision, tolerance)} \\neq 0`,
      explanation: `Ở hàng ${inconsistentRow + 1} của ma trận bậc thang, mọi hệ số của ẩn đều bằng 0 nhưng vế phải bằng ${sToText(rhsVal, precision, tolerance)} ≠ 0. Do đó rank(A) = ${rankA} < rank([A|B]) = ${exactRankAug}.`,
      matrixAfter: matrixToDisplayData(elim.matrix, precision, tolerance, n),
      augmentedSplitCol: n,
      highlightedRows: [inconsistentRow],
    });

    return {
      id: crypto.randomUUID(),
      operationId: 'linear-system',
      operationName: 'Giải hệ phương trình tuyến tính (AX = B)',
      algorithmName: algoName,
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: 'AX = B',
      inputMatrices: [
        { name: 'A', rows: m, cols: n, display: dispA },
        { name: 'B', rows: mB, cols: k, display: dispB },
      ],
      conditionsCheck: {
        met: true,
        items: [
          {
            label: 'Định lý Kronecker-Capelli (Rouché-Capelli)',
            satisfied: false,
            detail: `rank(A) = ${rankA} < rank([A | B]) = ${exactRankAug}. Hệ mâu thuẫn.`,
          },
        ],
      },
      steps,
      resultTitle: 'Hệ phương trình VÔ NGHIỆM',
      resultLatex: '\\text{Hệ vô nghiệm } (S = \\varnothing)',
      resultText: 'Hệ vô nghiệm (S = ∅)',
      resultMatrix: matrixToDisplayData(elim.matrix, precision, tolerance, n),
      verification: {
        passed: true,
        label: 'So sánh hạng theo định lý Kronecker-Capelli',
        formulaLatex: `\\operatorname{rank}(A) = ${rankA} < \\operatorname{rank}([A \\mid B]) = ${exactRankAug}`,
        detail: `Hàng ${inconsistentRow + 1} cho phương trình vô lý 0 = ${sToText(rhsVal, precision, tolerance)}.`,
      },
      conclusion: `Hệ phương trình vô nghiệm vì rank(A) = ${rankA} < rank([A | B]) = ${exactRankAug} (xuất hiện phương trình mâu thuẫn ở hàng ${inconsistentRow + 1}).`,
      durationMs: performance.now() - start,
    };
  }

  // Consistent system: either unique (rankA === n) or infinitely many (rankA < n)
  // For back-substitution if REF (Gaussian), compute RREF matrix cleanly from REF so solution extraction is 100% consistent
  let finalRref = elim.matrix;
  if (!isGaussJordan) {
    const rrefPass = runElimination(elim.matrix, {
      mode,
      precision,
      tolerance,
      maxPivotCol: n,
      augmentedSplitCol: n,
      reduceAbovePivots: true,
      normalizePivots: true,
    });
    finalRref = rrefPass.matrix;
    if (rrefPass.steps.length > 0) {
      steps.push({
        stepNumber: steps.length + 1,
        stage: 'Thế ngược từ dạng bậc thang',
        isMajorStage: true,
        explanation:
          rankA === n
            ? 'Thực hiện thế ngược từ phương trình dưới lên trên để tìm giá trị từng ẩn.'
            : 'Thực hiện thế ngược các ẩn trụ theo các ẩn tự do.',
        matrixBefore: matrixToDisplayData(elim.matrix, precision, tolerance, n),
        matrixAfter: matrixToDisplayData(finalRref, precision, tolerance, n),
        augmentedSplitCol: n,
      });
    }
  }

  if (rankA === n) {
    // Unique solution!
    const X = Array.from({ length: n }, (_, rowIdx) => finalRref[rowIdx].slice(n, n + k));
    const AX = multiplyRawMatrices(A, X);
    const residual = matrixMaxNormDiff(AX, B);
    const dispX = matrixToDisplayData(X, precision, tolerance);

    const solLatexParts = X.map((row, idx) =>
      k === 1
        ? `x_{${idx + 1}} = ${sToLatex(row[0], precision, tolerance)}`
        : `x_{${idx + 1}} = (${row.map((v) => sToLatex(v, precision, tolerance)).join(', ')})`
    );
    const solTextParts = X.map((row, idx) =>
      k === 1
        ? `x_${idx + 1} = ${sToText(row[0], precision, tolerance)}`
        : `x_${idx + 1} = [${row.map((v) => sToText(v, precision, tolerance)).join(', ')}]`
    );

    return {
      id: crypto.randomUUID(),
      operationId: 'linear-system',
      operationName: 'Giải hệ phương trình tuyến tính (AX = B)',
      algorithmName: algoName,
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: 'AX = B',
      inputMatrices: [
        { name: 'A', rows: m, cols: n, display: dispA },
        { name: 'B', rows: mB, cols: k, display: dispB },
      ],
      conditionsCheck: {
        met: true,
        items: [
          {
            label: 'Định lý Kronecker-Capelli (Rouché-Capelli)',
            satisfied: true,
            detail: `rank(A) = rank([A | B]) = ${rankA} = n (số ẩn). Hệ có nghiệm duy nhất.`,
          },
        ],
      },
      steps,
      resultTitle: 'Hệ có NGHIỆM DUY NHẤT',
      resultLatex:
        k === 1
          ? `\\begin{cases} ${solLatexParts.join(' \\\\ ')} \\end{cases}`
          : `X = ${matrixToLatex(X, precision, tolerance)}`,
      resultText: solTextParts.join('\n'),
      resultMatrix: dispX,
      verification: {
        passed: mode === 'exact' ? residual === 0 : residual <= Math.max(tolerance * 100, 1e-7),
        label: 'Kiểm tra lại AX = B',
        formulaLatex: mode === 'exact' ? 'AX = B' : `\\|AX - B\\|_\\infty = ${residual.toExponential(2)}`,
        residualNorm: residual,
        detail: `Thay nghiệm vào hệ phương trình ban đầu cho sai số dư ${residual.toExponential(2)}.`,
      },
      conclusion: `Hệ phương trình có nghiệm duy nhất vì rank(A) = rank([A | B]) = ${n}.`,
      durationMs: performance.now() - start,
    };
  }

  // Infinitely many solutions (rankA < n)
  const freeCols = elim.freeColumns;
  const pivotCols = elim.pivotColumns;
  const paramNames = freeCols.map((_, idx) => `t_{${idx + 1}}`);
  const paramTextNames = freeCols.map((_, idx) => `t_${idx + 1}`);

  // Express for each RHS column (if k === 1, standard parametric form; if k > 1, show per-column or general RREF)
  const parametricLinesLatex: string[] = [];
  const parametricLinesText: string[] = [];

  if (k === 1) {
    // Particular solution vector x_p and basis vectors for null space
    const particular: Scalar[] = Array(n).fill(scalarZero(mode));
    for (let pIdx = 0; pIdx < pivotCols.length; pIdx++) {
      particular[pivotCols[pIdx]] = finalRref[pIdx][n];
    }

    for (let varIdx = 0; varIdx < n; varIdx++) {
      const freeIdx = freeCols.indexOf(varIdx);
      if (freeIdx !== -1) {
        parametricLinesLatex.push(`x_{${varIdx + 1}} = ${paramNames[freeIdx]} \\in \\mathbb{R}`);
        parametricLinesText.push(`x_${varIdx + 1} = ${paramTextNames[freeIdx]} (tham số tự do)`);
      } else {
        const pRow = pivotCols.indexOf(varIdx);
        const constTerm = finalRref[pRow][n];
        let rhsLatex = '';
        let rhsText = '';
        let hasTerm = false;

        if (!sIsZero(constTerm, tolerance)) {
          rhsLatex += sToLatex(constTerm, precision, tolerance);
          rhsText += sToText(constTerm, precision, tolerance);
          hasTerm = true;
        }

        for (let f = 0; f < freeCols.length; f++) {
          const fc = freeCols[f];
          const entry = finalRref[pRow][fc];
          if (!sIsZero(entry, tolerance)) {
            const negEntry = sNeg(entry);
            rhsLatex += formatLinearCombinationTerm(negEntry, paramNames[f], !hasTerm, precision, tolerance);
            const valNum = sToNumber(negEntry);
            const absT = sToText(valNum < 0 ? sNeg(negEntry) : negEntry, precision, tolerance);
            const coeffStr = absT === '1' ? '' : `${absT}`;
            rhsText += hasTerm
              ? `${valNum < 0 ? ' - ' : ' + '}${coeffStr}${paramTextNames[f]}`
              : `${valNum < 0 ? '-' : ''}${coeffStr}${paramTextNames[f]}`;
            hasTerm = true;
          }
        }

        if (!hasTerm) {
          rhsLatex = '0';
          rhsText = '0';
        }

        parametricLinesLatex.push(`x_{${varIdx + 1}} = ${rhsLatex}`);
        parametricLinesText.push(`x_${varIdx + 1} = ${rhsText}`);
      }
    }

    // Verify particular solution satisfies A * x_p = b
    const Xp = particular.map((v) => [v]);
    const AXp = multiplyRawMatrices(A, Xp);
    const residual = matrixMaxNormDiff(AXp, B);

    return {
      id: crypto.randomUUID(),
      operationId: 'linear-system',
      operationName: 'Giải hệ phương trình tuyến tính (AX = B)',
      algorithmName: algoName,
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: 'AX = B',
      inputMatrices: [
        { name: 'A', rows: m, cols: n, display: dispA },
        { name: 'B', rows: mB, cols: k, display: dispB },
      ],
      conditionsCheck: {
        met: true,
        items: [
          {
            label: 'Định lý Kronecker-Capelli (Rouché-Capelli)',
            satisfied: true,
            detail: `rank(A) = rank([A | B]) = ${rankA} < n = ${n}. Hệ có vô số nghiệm phụ thuộc ${freeCols.length} tham số tự do.`,
          },
        ],
      },
      steps,
      resultTitle: `Hệ có VÔ SỐ NGHIỆM (${freeCols.length} tham số tự do)`,
      resultLatex: `\\begin{cases} ${parametricLinesLatex.join(' \\\\ ')} \\end{cases}`,
      resultText: parametricLinesText.join('\n'),
      resultMatrix: matrixToDisplayData(finalRref, precision, tolerance, n),
      verification: {
        passed: mode === 'exact' ? residual === 0 : residual <= Math.max(tolerance * 100, 1e-7),
        label: 'Kiểm tra nghiệm riêng (khi các tham số tự do bằng 0)',
        formulaLatex: mode === 'exact' ? 'A x_p = b' : `\\|A x_p - b\\|_\\infty = ${residual.toExponential(2)}`,
        residualNorm: residual,
        detail: `Ẩn chính (trụ): ${pivotCols.map((c) => `x_${c + 1}`).join(', ')}. Ẩn tự do: ${freeCols.map((c) => `x_${c + 1}`).join(', ')}.`,
      },
      conclusion: `Hệ phương trình tương thích và có vô số nghiệm phụ thuộc ${freeCols.length} tham số tự do (${freeCols.map((c) => `x_${c + 1}`).join(', ')}).`,
      durationMs: performance.now() - start,
    };
  }

  // Multiple RHS columns with infinitely many solutions: show RREF
  return {
    id: crypto.randomUUID(),
    operationId: 'linear-system',
    operationName: 'Giải hệ phương trình tuyến tính (AX = B)',
    algorithmName: algoName,
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: 'AX = B',
    inputMatrices: [
      { name: 'A', rows: m, cols: n, display: dispA },
      { name: 'B', rows: mB, cols: k, display: dispB },
    ],
    conditionsCheck: {
      met: true,
      items: [
        {
          label: 'Định lý Kronecker-Capelli',
          satisfied: true,
          detail: `rank(A) = rank([A | B]) = ${rankA} < n = ${n}. Mỗi cột vế phải đều có vô số nghiệm phụ thuộc ${freeCols.length} tham số tự do.`,
        },
      ],
    },
    steps,
    resultTitle: `Hệ có VÔ SỐ NGHIỆM (${freeCols.length} biến tự do)`,
    resultLatex: `\\operatorname{RREF}([A \\mid B]) = ${matrixToLatex(finalRref, precision, tolerance, n)}`,
    resultText: `rank(A) = rank([A|B]) = ${rankA} < ${n}. Biến tự do: ${freeCols.map((c) => `x_${c + 1}`).join(', ')}.`,
    resultMatrix: matrixToDisplayData(finalRref, precision, tolerance, n),
    conclusion: `Hệ có vô số nghiệm với ${freeCols.length} biến tự do: ${freeCols.map((c) => `x_${c + 1}`).join(', ')}.`,
    durationMs: performance.now() - start,
  };
}

// Keep unused imports clean
export { sAdd, sMul, sSub };
