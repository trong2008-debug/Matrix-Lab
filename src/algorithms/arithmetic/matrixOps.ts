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
  matricesEqual,
  matrixMaxNormDiff,
  matrixToDisplayData,
  matrixToLatex,
  multiplyRawMatrices,
  sAdd,
  scalarZero,
  sMul,
  sSub,
  sToLatex,
  sToText,
} from './scalar';
import { computeInverseRaw } from '../inverse/inverse';

export function buildAddSubReport(
  A: Scalar[][],
  B: Scalar[][],
  isSubtract: boolean,
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const rowsA = A.length;
  const colsA = A[0].length;
  const rowsB = B.length;
  const colsB = B[0].length;
  const opSign = isSubtract ? '-' : '+';
  const opName = isSubtract ? 'Phép trừ ma trận (A - B)' : 'Phép cộng ma trận (A + B)';

  const sameDim = rowsA === rowsB && colsA === colsB;
  const dispA = matrixToDisplayData(A, precision, tolerance);
  const dispB = matrixToDisplayData(B, precision, tolerance);

  if (!sameDim) {
    return {
      id: crypto.randomUUID(),
      operationId: 'add-sub',
      operationName: opName,
      algorithmName: 'Tính toán từng phần tử tương ứng',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: `C = A ${opSign} B`,
      inputMatrices: [
        { name: 'A', rows: rowsA, cols: colsA, display: dispA },
        { name: 'B', rows: rowsB, cols: colsB, display: dispB },
      ],
      conditionsCheck: {
        met: false,
        items: [
          {
            label: 'Cùng kích thước',
            satisfied: false,
            detail: `Ma trận A có cỡ ${rowsA} × ${colsA}, trong khi ma trận B có cỡ ${rowsB} × ${colsB}. Hai ma trận không tương thích về kích thước.`,
          },
        ],
      },
      steps: [],
      resultTitle: 'Không thể thực hiện phép toán',
      resultLatex: '\\text{Không xác định (khác kích thước)}',
      resultText: 'Hai ma trận không có cùng kích thước.',
      conclusion: `Không thể tính ${isSubtract ? 'hiệu' : 'tổng'} của hai ma trận khác kích thước (${rowsA} × ${colsA} và ${rowsB} × ${colsB}).`,
      durationMs: performance.now() - start,
    };
  }

  const C = createZeroMatrix(rowsA, colsA, mode);
  const steps: CalculationStep[] = [];
  const formulaRows: string[] = [];

  for (let i = 0; i < rowsA; i++) {
    const rowFormulas: string[] = [];
    for (let j = 0; j < colsA; j++) {
      C[i][j] = isSubtract ? sSub(A[i][j], B[i][j]) : sAdd(A[i][j], B[i][j]);
      const aL = sToLatex(A[i][j], precision, tolerance);
      const bVal = B[i][j];
      const bL = sToLatex(bVal, precision, tolerance);
      const bWrapped = bL.startsWith('-') ? `(${bL})` : bL;
      rowFormulas.push(`${aL} ${opSign} ${bWrapped}`);
    }
    formulaRows.push(rowFormulas.join(' & '));
  }

  steps.push({
    stepNumber: 1,
    stage: 'Áp dụng công thức từng phần tử',
    isMajorStage: true,
    operationNotation: `C_{ij} = A_{ij} ${opSign} B_{ij}`,
    explanation: `Thực hiện ${isSubtract ? 'trừ' : 'cộng'} từng cặp phần tử ở cùng vị trí hàng i, cột j cho toàn bộ ${rowsA * colsA} phần tử.`,
    formulaLatex: `A ${opSign} B = \\begin{bmatrix} ${formulaRows.join(' \\\\ ')} \\end{bmatrix}`,
    matrixAfter: matrixToDisplayData(C, precision, tolerance),
  });

  const dispC = matrixToDisplayData(C, precision, tolerance);
  return {
    id: crypto.randomUUID(),
    operationId: 'add-sub',
    operationName: opName,
    algorithmName:
      mode === 'exact'
        ? 'Cộng/trừ từng phần tử (số học phân số chính xác)'
        : 'Cộng/trừ từng phần tử (dấu phẩy động)',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `C = A ${opSign} B`,
    inputMatrices: [
      { name: 'A', rows: rowsA, cols: colsA, display: dispA },
      { name: 'B', rows: rowsB, cols: colsB, display: dispB },
    ],
    conditionsCheck: {
      met: true,
      items: [
        {
          label: 'Cùng kích thước',
          satisfied: true,
          detail: `Cả hai ma trận A và B đều có kích thước ${rowsA} × ${colsA}.`,
        },
      ],
    },
    steps,
    resultTitle: `Kết quả ${isSubtract ? 'A - B' : 'A + B'}`,
    resultLatex: `A ${opSign} B = ${matrixToLatex(C, precision, tolerance)}`,
    resultText: dispC.entries.map((r) => `[${r.join(', ')}]`).join('\n'),
    resultMatrix: dispC,
    conclusion: `Phép ${isSubtract ? 'trừ' : 'cộng'} hoàn tất, thu được ma trận kết quả cỡ ${rowsA} × ${colsA}.`,
    durationMs: performance.now() - start,
  };
}

export function buildMultiplyReport(
  A: Scalar[][],
  B: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const m = A.length;
  const nA = A[0].length;
  const nB = B.length;
  const p = B[0].length;
  const dispA = matrixToDisplayData(A, precision, tolerance);
  const dispB = matrixToDisplayData(B, precision, tolerance);

  if (nA !== nB) {
    return {
      id: crypto.randomUUID(),
      operationId: 'multiply',
      operationName: 'Phép nhân ma trận (AB)',
      algorithmName: 'Nhân hàng với cột chuẩn',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: 'C = A \\cdot B',
      inputMatrices: [
        { name: 'A', rows: m, cols: nA, display: dispA },
        { name: 'B', rows: nB, cols: p, display: dispB },
      ],
      conditionsCheck: {
        met: false,
        items: [
          {
            label: 'Tương thích số cột của A và số hàng của B',
            satisfied: false,
            detail: `Ma trận A có ${nA} cột, nhưng ma trận B có ${nB} hàng (${nA} ≠ ${nB}).`,
          },
        ],
      },
      steps: [],
      resultTitle: 'Không thể nhân hai ma trận',
      resultLatex: '\\text{Không xác định (kích thước không tương thích)}',
      resultText: 'Số cột của A phải bằng số hàng của B.',
      conclusion: `Không thể thực hiện phép nhân AB do số cột của A (${nA}) khác số hàng của B (${nB}).`,
      durationMs: performance.now() - start,
    };
  }

  const C = createZeroMatrix(m, p, mode);
  const steps: CalculationStep[] = [];
  let stepNo = 1;
  const maxDetailCells = 24;
  let detailedCount = 0;

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < p; j++) {
      let sum = scalarZero(mode);
      const terms: string[] = [];
      for (let k = 0; k < nA; k++) {
        const prod = sMul(A[i][k], B[k][j]);
        sum = sAdd(sum, prod);
        const aL = sToLatex(A[i][k], precision, tolerance);
        const bL = sToLatex(B[k][j], precision, tolerance);
        const aWrapped = aL.startsWith('-') ? `(${aL})` : aL;
        const bWrapped = bL.startsWith('-') ? `(${bL})` : bL;
        terms.push(`${aWrapped} \\cdot ${bWrapped}`);
      }
      C[i][j] = sum;
      if (detailedCount < maxDetailCells) {
        detailedCount++;
        steps.push({
          stepNumber: stepNo++,
          stage: `Tính phần tử c_{${i + 1},${j + 1}}`,
          isMajorStage: j === 0,
          operationNotation: `c_{${i + 1},${j + 1}} = \\sum_{k=1}^{${nA}} a_{${i + 1}k} b_{k${j + 1}}`,
          explanation: `Tích vô hướng giữa hàng ${i + 1} của A và cột ${j + 1} của B cho phần tử (${i + 1}, ${j + 1}).`,
          formulaLatex: `c_{${i + 1},${j + 1}} = ${terms.join(' + ')} = ${sToLatex(sum, precision, tolerance)}`,
        });
      }
    }
  }

  if (m * p > maxDetailCells) {
    steps.push({
      stepNumber: stepNo,
      stage: 'Hoàn tất các phần tử còn lại',
      isMajorStage: true,
      explanation: `Các phần tử còn lại (tổng cộng ${m * p} phần tử) được tính theo cùng quy tắc nhân hàng với cột.`,
      matrixAfter: matrixToDisplayData(C, precision, tolerance),
    });
  } else {
    steps.push({
      stepNumber: stepNo,
      stage: 'Tổng hợp ma trận tích',
      isMajorStage: true,
      explanation: `Ghép tất cả các phần tử vừa tính vào ma trận tích cỡ ${m} × ${p}.`,
      matrixAfter: matrixToDisplayData(C, precision, tolerance),
    });
  }

  const dispC = matrixToDisplayData(C, precision, tolerance);
  return {
    id: crypto.randomUUID(),
    operationId: 'multiply',
    operationName: 'Phép nhân ma trận (AB)',
    algorithmName:
      mode === 'exact'
        ? 'Nhân hàng với cột chuẩn (số học phân số chính xác)'
        : 'Nhân hàng với cột chuẩn (dấu phẩy động)',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `C_{${m}\\times ${p}} = A_{${m}\\times ${nA}} \\cdot B_{${nB}\\times ${p}}`,
    inputMatrices: [
      { name: 'A', rows: m, cols: nA, display: dispA },
      { name: 'B', rows: nB, cols: p, display: dispB },
    ],
    conditionsCheck: {
      met: true,
      items: [
        {
          label: 'Điều kiện kích thước nhân ma trận',
          satisfied: true,
          detail: `Số cột của A (${nA}) bằng số hàng của B (${nB}). Ma trận tích có cỡ ${m} × ${p}.`,
        },
      ],
    },
    steps,
    resultTitle: 'Ma trận tích AB',
    resultLatex: `AB = ${matrixToLatex(C, precision, tolerance)}`,
    resultText: dispC.entries.map((r) => `[${r.join(', ')}]`).join('\n'),
    resultMatrix: dispC,
    conclusion: `Tích AB tồn tại và là ma trận cỡ ${m} × ${p}.`,
    durationMs: performance.now() - start,
  };
}

export function buildScalarMultiplyReport(
  k: Scalar,
  A: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const m = A.length;
  const n = A[0].length;
  const kLatex = sToLatex(k, precision, tolerance);
  const kText = sToText(k, precision, tolerance);
  const C = createZeroMatrix(m, n, mode);
  const formulaRows: string[] = [];

  for (let i = 0; i < m; i++) {
    const rowF: string[] = [];
    for (let j = 0; j < n; j++) {
      C[i][j] = sMul(k, A[i][j]);
      const aL = sToLatex(A[i][j], precision, tolerance);
      const aW = aL.startsWith('-') ? `(${aL})` : aL;
      const kW = kLatex.startsWith('-') ? `(${kLatex})` : kLatex;
      rowF.push(`${kW} \\cdot ${aW}`);
    }
    formulaRows.push(rowF.join(' & '));
  }

  const dispA = matrixToDisplayData(A, precision, tolerance);
  const dispC = matrixToDisplayData(C, precision, tolerance);

  return {
    id: crypto.randomUUID(),
    operationId: 'scalar-multiply',
    operationName: 'Nhân ma trận với số vô hướng (kA)',
    algorithmName:
      mode === 'exact'
        ? 'Nhân từng phần tử với vô hướng (số học phân số chính xác)'
        : 'Nhân từng phần tử với vô hướng (dấu phẩy động)',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `C = ${kLatex} \\cdot A`,
    inputMatrices: [{ name: 'A', rows: m, cols: n, display: dispA }],
    extraParamsText: `k = ${kText}`,
    conditionsCheck: {
      met: true,
      items: [
        {
          label: 'Phép nhân vô hướng luôn xác định',
          satisfied: true,
          detail: `Nhân hệ số k = ${kText} với mọi phần tử của ma trận A cỡ ${m} × ${n}.`,
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        stage: 'Nhân vô hướng từng phần tử',
        isMajorStage: true,
        operationNotation: `C_{ij} = (${kLatex}) \\cdot A_{ij}`,
        explanation: `Nhân từng phần tử của ma trận A với hằng số k = ${kText}.`,
        formulaLatex: `${kLatex} A = \\begin{bmatrix} ${formulaRows.join(' \\\\ ')} \\end{bmatrix}`,
        matrixAfter: dispC,
      },
    ],
    resultTitle: 'Kết quả kA',
    resultLatex: `${kLatex} A = ${matrixToLatex(C, precision, tolerance)}`,
    resultText: dispC.entries.map((r) => `[${r.join(', ')}]`).join('\n'),
    resultMatrix: dispC,
    conclusion: `Đã nhân ma trận A với hệ số k = ${kText}, giữ nguyên kích thước ${m} × ${n}.`,
    durationMs: performance.now() - start,
  };
}

export function buildPowerReport(
  A: Scalar[][],
  exponent: number,
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
      operationId: 'power',
      operationName: `Lũy thừa ma trận (A^{${exponent}})`,
      algorithmName: 'Bình phương và nhân nhị phân',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: `A^{${exponent}}`,
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
      resultTitle: 'Không thể tính lũy thừa',
      resultLatex: '\\text{Không xác định (không phải ma trận vuông)}',
      resultText: 'Lũy thừa ma trận chỉ xác định cho ma trận vuông.',
      conclusion: 'Không thể tính lũy thừa vì ma trận A không vuông.',
      durationMs: performance.now() - start,
    };
  }

  const steps: CalculationStep[] = [];
  let stepNo = 1;
  let base = A;

  if (exponent === 0) {
    const I = createIdentityMatrix(rows, mode);
    const dispI = matrixToDisplayData(I, precision, tolerance);
    return {
      id: crypto.randomUUID(),
      operationId: 'power',
      operationName: 'Lũy thừa ma trận (A^0)',
      algorithmName: 'Quy ước ma trận đơn vị cho số mũ 0',
      modeUsed: mode,
      isExactResult: mode === 'exact',
      problemStatementLatex: 'A^0 = I_n',
      inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
      conditionsCheck: {
        met: true,
        items: [{ label: 'Ma trận vuông', satisfied: true, detail: `A là ma trận vuông cấp ${rows}.` }],
      },
      steps: [
        {
          stepNumber: 1,
          stage: 'Áp dụng quy ước A^0 = I',
          isMajorStage: true,
          operationNotation: `A^0 = I_{${rows}}`,
          explanation: `Theo định nghĩa đại số tuyến tính, lũy thừa bậc 0 của ma trận vuông cấp ${rows} là ma trận đơn vị cấp ${rows}.`,
          matrixAfter: dispI,
        },
      ],
      resultTitle: 'Ma trận A^0',
      resultLatex: `A^0 = ${matrixToLatex(I, precision, tolerance)}`,
      resultText: dispI.entries.map((r) => `[${r.join(', ')}]`).join('\n'),
      resultMatrix: dispI,
      conclusion: `A^0 bằng ma trận đơn vị I_${rows}.`,
      durationMs: performance.now() - start,
    };
  }

  if (exponent < 0) {
    const inv = computeInverseRaw(A, mode, precision, tolerance);
    if (!inv.invertible || !inv.inverse) {
      return {
        id: crypto.randomUUID(),
        operationId: 'power',
        operationName: `Lũy thừa âm (A^{${exponent}})`,
        algorithmName: 'Nghịch đảo Gauss-Jordan và bình phương nhị phân',
        modeUsed: mode,
        isExactResult: mode === 'exact',
        problemStatementLatex: `A^{${exponent}} = (A^{-1})^{${-exponent}}`,
        inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
        conditionsCheck: {
          met: true,
          items: [
            { label: 'Ma trận vuông', satisfied: true, detail: `A là ma trận vuông cấp ${rows}.` },
            {
              label: 'Ma trận khả nghịch',
              satisfied: false,
              detail: 'A là ma trận suy biến (không khả nghịch) nên không tồn tại A^{-1}.',
            },
          ],
        },
        steps: inv.steps,
        resultTitle: 'Không tồn tại lũy thừa âm',
        resultLatex: '\\text{Không xác định (ma trận suy biến)}',
        resultText: 'Ma trận không khả nghịch nên không thể tính lũy thừa âm.',
        conclusion: `Không thể tính A^{${exponent}} vì ma trận A không khả nghịch.`,
        durationMs: performance.now() - start,
      };
    }
    base = inv.inverse;
    steps.push({
      stepNumber: stepNo++,
      stage: 'Tìm ma trận nghịch đảo A^{-1}',
      isMajorStage: true,
      operationNotation: `A^{${exponent}} = (A^{-1})^{${-exponent}}`,
      explanation: `Do số mũ là số âm (${exponent}), ta tính ma trận nghịch đảo A^{-1} bằng phương pháp Gauss-Jordan trước, sau đó nâng lên lũy thừa ${-exponent}.`,
      matrixAfter: matrixToDisplayData(base, precision, tolerance),
    });
  }

  // Binary exponentiation on base^(|exponent|)
  const absExp = Math.abs(exponent);
  let res = createIdentityMatrix(rows, mode);
  let cur = base;
  let curPow = 1;
  let rem = absExp;
  let accumulatedPow = 0;
  const baseSymbol = exponent < 0 ? '(A^{-1})' : 'A';

  while (rem > 0) {
    if (rem % 2 === 1) {
      res = multiplyRawMatrices(res, cur);
      accumulatedPow += curPow;
      steps.push({
        stepNumber: stepNo++,
        stage: 'Nhân tích lũy vào kết quả',
        isMajorStage: true,
        operationNotation: `${baseSymbol}^{${accumulatedPow}} = ${baseSymbol}^{${accumulatedPow - curPow}} \\cdot ${baseSymbol}^{${curPow}}`,
        explanation: `Nhân ma trận kết quả tạm thời với lũy thừa cơ sở bậc ${curPow}.`,
        matrixAfter: matrixToDisplayData(res, precision, tolerance),
      });
    }
    rem = Math.floor(rem / 2);
    if (rem > 0) {
      cur = multiplyRawMatrices(cur, cur);
      curPow *= 2;
      steps.push({
        stepNumber: stepNo++,
        stage: 'Bình phương lũy thừa cơ sở',
        isMajorStage: false,
        operationNotation: `${baseSymbol}^{${curPow}} = (${baseSymbol}^{${curPow / 2}})^2`,
        explanation: `Bình phương ma trận ${baseSymbol}^{${curPow / 2}} để giảm số phép nhân theo thuật toán lũy thừa nhị phân.`,
        matrixAfter: matrixToDisplayData(cur, precision, tolerance),
      });
    }
  }

  const dispRes = matrixToDisplayData(res, precision, tolerance);
  return {
    id: crypto.randomUUID(),
    operationId: 'power',
    operationName: `Lũy thừa ma trận (A^{${exponent}})`,
    algorithmName:
      exponent < 0
        ? 'Nghịch đảo Gauss-Jordan kết hợp lũy thừa nhị phân'
        : 'Thuật toán bình phương và nhân nhị phân',
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: `A^{${exponent}}`,
    inputMatrices: [{ name: 'A', rows, cols, display: dispA }],
    extraParamsText: `n = ${exponent}`,
    conditionsCheck: {
      met: true,
      items: [
        { label: 'Ma trận vuông', satisfied: true, detail: `A là ma trận vuông cấp ${rows}.` },
        ...(exponent < 0
          ? [{ label: 'Ma trận khả nghịch', satisfied: true, detail: 'A khả nghịch, tồn tại A^{-1}.' }]
          : []),
      ],
    },
    steps,
    resultTitle: `Kết quả A^{${exponent}}`,
    resultLatex: `A^{${exponent}} = ${matrixToLatex(res, precision, tolerance)}`,
    resultText: dispRes.entries.map((r) => `[${r.join(', ')}]`).join('\n'),
    resultMatrix: dispRes,
    conclusion: `Đã tính xong A^{${exponent}} bằng thuật toán lũy thừa nhị phân trong ${steps.length} bước.`,
    durationMs: performance.now() - start,
  };
}

export function buildEqualityReport(
  A: Scalar[][],
  B: Scalar[][],
  mode: ResolvedComputationMode,
  precision: number = DEFAULT_PRECISION,
  tolerance: number = DEFAULT_TOLERANCE
): CalculationReport {
  const start = performance.now();
  const rowsA = A.length;
  const colsA = A[0].length;
  const rowsB = B.length;
  const colsB = B[0].length;
  const dispA = matrixToDisplayData(A, precision, tolerance);
  const dispB = matrixToDisplayData(B, precision, tolerance);

  if (rowsA !== rowsB || colsA !== colsB) {
    return {
      id: crypto.randomUUID(),
      operationId: 'equality',
      operationName: 'So sánh hai ma trận (A = B)',
      algorithmName: 'Kiểm tra kích thước và từng phần tử tương ứng',
      modeUsed: mode,
      isExactResult: true,
      problemStatementLatex: 'A \\stackrel{?}{=} B',
      inputMatrices: [
        { name: 'A', rows: rowsA, cols: colsA, display: dispA },
        { name: 'B', rows: rowsB, cols: colsB, display: dispB },
      ],
      conditionsCheck: {
        met: true,
        items: [
          {
            label: 'So sánh kích thước',
            satisfied: false,
            detail: `A cỡ ${rowsA} × ${colsA} khác B cỡ ${rowsB} × ${colsB}.`,
          },
        ],
      },
      steps: [],
      resultTitle: 'Hai ma trận KHÔNG bằng nhau',
      resultLatex: 'A \\neq B',
      resultText: 'A ≠ B (khác kích thước)',
      conclusion: `Hai ma trận không bằng nhau vì kích thước khác nhau (${rowsA} × ${colsA} so với ${rowsB} × ${colsB}).`,
      durationMs: performance.now() - start,
    };
  }

  const diff = matrixMaxNormDiff(A, B);
  const exactEq = mode === 'exact' && matricesEqual(A, B, 0);
  const numEq = matricesEqual(A, B, tolerance);
  const mismatchedCells: string[] = [];
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsA; j++) {
      if (!matricesEqual([[A[i][j]]], [[B[i][j]]], mode === 'exact' ? 0 : tolerance)) {
        mismatchedCells.push(
          `(${i + 1}, ${j + 1}): ${sToText(A[i][j], precision, tolerance)} ≠ ${sToText(B[i][j], precision, tolerance)}`
        );
      }
    }
  }

  const isEqual = mode === 'exact' ? exactEq : numEq;
  const statusLatex =
    mode === 'exact'
      ? isEqual
        ? 'A = B \\quad (\\text{bằng nhau chính xác})'
        : 'A \\neq B'
      : isEqual
        ? `A \\approx B \\quad (\\|A - B\\|_\\infty = ${diff.toExponential(2)} \\le ${tolerance})`
        : `A \\neq B \\quad (\\|A - B\\|_\\infty = ${diff.toExponential(2)})`;

  return {
    id: crypto.randomUUID(),
    operationId: 'equality',
    operationName: 'So sánh hai ma trận (A = B)',
    algorithmName:
      mode === 'exact'
        ? 'So sánh phân số chính xác từng phần tử'
        : `So sánh số học với sai số cho phép ε = ${tolerance}`,
    modeUsed: mode,
    isExactResult: mode === 'exact',
    problemStatementLatex: 'A \\stackrel{?}{=} B',
    inputMatrices: [
      { name: 'A', rows: rowsA, cols: colsA, display: dispA },
      { name: 'B', rows: rowsB, cols: colsB, display: dispB },
    ],
    conditionsCheck: {
      met: true,
      items: [
        {
          label: 'Cùng kích thước',
          satisfied: true,
          detail: `Cả hai ma trận đều có cỡ ${rowsA} × ${colsA}.`,
        },
        {
          label: mode === 'exact' ? 'So khớp chính xác từng phần tử' : 'So khớp trong ngưỡng dung sai số học',
          satisfied: isEqual,
          detail: isEqual
            ? mode === 'exact'
              ? 'Mọi phần tử tương ứng bằng nhau tuyệt đối.'
              : `Sai lệch lớn nhất max|A_{ij} - B_{ij}| = ${diff.toExponential(2)} ≤ ${tolerance}.`
            : `Phát hiện ${mismatchedCells.length} vị trí khác nhau: ${mismatchedCells.slice(0, 5).join('; ')}${mismatchedCells.length > 5 ? '...' : ''}`,
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        stage: 'Kiểm tra từng phần tử',
        isMajorStage: true,
        operationNotation: `\\|A - B\\|_\\infty = \\max_{i,j} |A_{ij} - B_{ij}| = ${diff.toExponential(2)}`,
        explanation: isEqual
          ? 'Tất cả phần tử tương ứng thỏa mãn điều kiện bằng nhau.'
          : `Các vị trí sai khác: ${mismatchedCells.slice(0, 6).join(', ')}.`,
      },
    ],
    resultTitle: isEqual
      ? mode === 'exact'
        ? 'Hai ma trận bằng nhau chính xác'
        : 'Hai ma trận bằng nhau (trong ngưỡng sai số)'
      : 'Hai ma trận KHÔNG bằng nhau',
    resultLatex: statusLatex,
    resultText: isEqual ? 'A = B' : 'A ≠ B',
    conclusion: isEqual
      ? mode === 'exact'
        ? 'Hai ma trận A và B bằng nhau chính xác.'
        : `Hai ma trận bằng nhau theo sai số số học ε = ${tolerance} (sai lệch cực đại ${diff.toExponential(2)}).`
      : 'Hai ma trận không bằng nhau.',
    durationMs: performance.now() - start,
  };
}
