import { describe, expect, it } from 'vitest';
import { executeCalculation } from '@/src/services/calculation-service/calculationService';
import {
  matricesEqual,
  parseMatrixRaw,
  transposeRawMatrix,
  multiplyRawMatrices,
} from '@/src/algorithms/arithmetic/scalar';
import { computeDeterminantScalar } from '@/src/algorithms/determinant/determinant';
import { runElimination } from '@/src/algorithms/elimination/echelon';

describe('Phép toán ma trận cơ bản, đặc trưng và các đồng nhất thức', () => {
  it('cộng, trừ, nhân vô hướng và nhân ma trận chính xác phân số', () => {
    const A = [
      ['1/2', '2'],
      ['-1', '1/3'],
    ];
    const B = [
      ['1/3', '-1'],
      ['2', '2/3'],
    ];

    const addRes = executeCalculation({
      operationId: 'add-sub',
      matrixA: A,
      matrixB: B,
      subOp: 'add',
      computationMode: 'exact',
    });
    expect(addRes.ok).toBe(true);
    if (addRes.ok) {
      expect(addRes.report.resultMatrix?.entries).toEqual([
        ['5/6', '1'],
        ['1', '1'],
      ]);
    }

    const mulRes = executeCalculation({
      operationId: 'multiply',
      matrixA: A,
      matrixB: B,
      computationMode: 'exact',
    });
    expect(mulRes.ok).toBe(true);
    if (mulRes.ok) {
      // (1/2)*(1/3) + 2*2 = 25/6 ; (1/2)*(-1) + 2*(2/3) = 5/6
      expect(mulRes.report.resultMatrix?.entries[0]).toEqual(['25/6', '5/6']);
    }
  });

  it('kiểm chứng định thức det(AB) = det(A)det(B) và nhất quán Laplace / Gauss / LU', () => {
    const A = [
      ['2', '1', '-1'],
      ['-3', '-1', '2'],
      ['-2', '1', '2'],
    ];
    const B = [
      ['1', '2', '0'],
      ['0', '1', '1'],
      ['2', '-1', '3'],
    ];

    const detLap = executeCalculation({
      operationId: 'determinant',
      matrixA: A,
      detMethod: 'laplace',
      computationMode: 'exact',
    });
    const detGauss = executeCalculation({
      operationId: 'determinant',
      matrixA: A,
      detMethod: 'gauss',
      computationMode: 'exact',
    });
    const detLU = executeCalculation({
      operationId: 'determinant',
      matrixA: A,
      detMethod: 'lu',
      computationMode: 'exact',
    });

    expect(detLap.ok && detGauss.ok && detLU.ok).toBe(true);
    if (detLap.ok && detGauss.ok && detLU.ok) {
      expect(detLap.report.resultText).toBe('det(A) = -1');
      expect(detGauss.report.resultText).toBe('det(A) = -1');
      expect(detLU.report.resultText).toBe('det(A) = -1');
    }

    const pA = parseMatrixRaw(A, 'A', 'exact');
    const pB = parseMatrixRaw(B, 'B', 'exact');
    expect(pA.ok && pB.ok).toBe(true);
    if (pA.ok && pB.ok) {
      const AB = multiplyRawMatrices(pA.matrix, pB.matrix);
      const detA = computeDeterminantScalar(pA.matrix, 'exact');
      const detB = computeDeterminantScalar(pB.matrix, 'exact');
      const detAB = computeDeterminantScalar(AB, 'exact');
      expect(detAB.kind === 'rational' && detA.kind === 'rational' && detB.kind === 'rational').toBe(true);
      if (detAB.kind === 'rational' && detA.kind === 'rational' && detB.kind === 'rational') {
        expect(detAB.value.num * detA.value.den * detB.value.den).toBe(
          detA.value.num * detB.value.num * detAB.value.den
        );
      }
    }
  });

  it('kiểm chứng nghịch đảo Gauss-Jordan AA^{-1} = I và từ chối ma trận suy biến', () => {
    const invRes = executeCalculation({
      operationId: 'inverse',
      matrixA: [
        ['1', '2'],
        ['3', '4'],
      ],
      computationMode: 'exact',
    });
    expect(invRes.ok).toBe(true);
    if (invRes.ok) {
      expect(invRes.report.resultMatrix?.entries).toEqual([
        ['-2', '1'],
        ['3/2', '-1/2'],
      ]);
      expect(invRes.report.verification?.passed).toBe(true);
      expect(invRes.report.verification?.residualNorm).toBe(0);
    }

    const singularRes = executeCalculation({
      operationId: 'inverse',
      matrixA: [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
      ],
      computationMode: 'exact',
    });
    expect(singularRes.ok).toBe(true);
    if (singularRes.ok) {
      expect(singularRes.report.conditionsCheck.met).toBe(false);
      expect(singularRes.report.resultMatrix).toBeUndefined();
    }
  });

  it('kiểm chứng đồng nhất thức chuyển vị và hạng: (A^T)^T = A và rank(A) = rank(A^T)', () => {
    const raw = [
      ['1', '2', '3', '4'],
      ['2', '4', '6', '8'],
      ['0', '1', '1', '2'],
    ];
    const parsed = parseMatrixRaw(raw, 'A', 'exact');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const AT = transposeRawMatrix(parsed.matrix);
      const ATT = transposeRawMatrix(AT);
      expect(matricesEqual(parsed.matrix, ATT, 0)).toBe(true);

      const rankA = runElimination(parsed.matrix, { mode: 'exact' }).rank;
      const rankAT = runElimination(AT, { mode: 'exact' }).rank;
      expect(rankA).toBe(2);
      expect(rankAT).toBe(rankA);
    }
  });

  it('tính ma trận phụ hợp adj(A) và kiểm chứng A·adj(A) = det(A)I', () => {
    const res = executeCalculation({
      operationId: 'adjugate',
      matrixA: [
        ['1', '2', '3'],
        ['0', '1', '4'],
        ['5', '6', '0'],
      ],
      computationMode: 'exact',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.report.verification?.passed).toBe(true);
      expect(res.report.verification?.residualNorm).toBe(0);
    }
  });

  it('tính lũy thừa A^0 = I và lũy thừa âm A^{-2}', () => {
    const pow0 = executeCalculation({
      operationId: 'power',
      matrixA: [
        ['2', '1'],
        ['0', '3'],
      ],
      exponent: 0,
      computationMode: 'exact',
    });
    expect(pow0.ok).toBe(true);
    if (pow0.ok) {
      expect(pow0.report.resultMatrix?.entries).toEqual([
        ['1', '0'],
        ['0', '1'],
      ]);
    }

    const powNeg = executeCalculation({
      operationId: 'power',
      matrixA: [
        ['2', '0'],
        ['0', '4'],
      ],
      exponent: -2,
      computationMode: 'exact',
    });
    expect(powNeg.ok).toBe(true);
    if (powNeg.ok) {
      expect(powNeg.report.resultMatrix?.entries).toEqual([
        ['1/4', '0'],
        ['0', '1/16'],
      ]);
    }
  });

  it('phân loại chính xác ma trận đối xứng xác định dương và ma trận trực giao', () => {
    const pd = executeCalculation({
      operationId: 'classify',
      matrixA: [
        ['4', '12', '-16'],
        ['12', '37', '-43'],
        ['-16', '-43', '98'],
      ],
      computationMode: 'exact',
    });
    expect(pd.ok).toBe(true);
    if (pd.ok) {
      const sym = pd.report.classifications?.find((c) => c.key === 'symmetric');
      const posDef = pd.report.classifications?.find((c) => c.key === 'positive_definite');
      expect(sym?.satisfied).toBe(true);
      expect(posDef?.satisfied).toBe(true);
    }

    // Rotation matrix 90 degrees is orthogonal
    const ortho = executeCalculation({
      operationId: 'classify',
      matrixA: [
        ['0', '-1'],
        ['1', '0'],
      ],
      computationMode: 'exact',
    });
    expect(ortho.ok).toBe(true);
    if (ortho.ok) {
      const isOrtho = ortho.report.classifications?.find((c) => c.key === 'orthogonal');
      const isSkew = ortho.report.classifications?.find((c) => c.key === 'skew_symmetric');
      expect(isOrtho?.satisfied).toBe(true);
      expect(isSkew?.satisfied).toBe(true);
    }
  });

  it('xử lý các trường hợp biên: ma trận 1x1, ma trận 0 và lỗi ô trống', () => {
    const oneByOne = executeCalculation({
      operationId: 'determinant',
      matrixA: [['-7/3']],
      computationMode: 'exact',
    });
    expect(oneByOne.ok).toBe(true);
    if (oneByOne.ok) {
      expect(oneByOne.report.resultText).toBe('det(A) = -7/3');
    }

    const emptyErr = executeCalculation({
      operationId: 'rank',
      matrixA: [['1', '']],
      computationMode: 'exact',
    });
    expect(emptyErr.ok).toBe(false);
    if (!emptyErr.ok) {
      expect(emptyErr.error.code).toBe('EMPTY_CELL');
    }
  });
});
