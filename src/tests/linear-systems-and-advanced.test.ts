import { describe, expect, it } from 'vitest';
import { executeCalculation } from '@/src/services/calculation-service/calculationService';

describe('Hệ phương trình tuyến tính, Không gian vectơ, Phân tích và Trị riêng', () => {
  it('giải hệ có nghiệm duy nhất nhất quán giữa Gauss, Gauss-Jordan, Cramer và Nghịch đảo', () => {
    const A = [
      ['2', '1', '-1'],
      ['-3', '-1', '2'],
      ['-2', '1', '2'],
    ];
    const B = [['8'], ['-11'], ['-3']];

    for (const method of ['gauss', 'gauss-jordan', 'cramer', 'inverse'] as const) {
      const res = executeCalculation({
        operationId: 'linear-system',
        matrixA: A,
        matrixB: B,
        systemMethod: method,
        computationMode: 'exact',
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.report.resultMatrix?.entries).toEqual([['2'], ['3'], ['-1']]);
        expect(res.report.verification?.passed).toBe(true);
      }
    }
  });

  it('biện luận chính xác hệ vô số nghiệm và hệ vô nghiệm', () => {
    // Infinitely many solutions
    const infRes = executeCalculation({
      operationId: 'linear-system',
      matrixA: [
        ['1', '2', '-1'],
        ['2', '4', '-2'],
      ],
      matrixB: [['3'], ['6']],
      systemMethod: 'gauss-jordan',
      computationMode: 'exact',
    });
    expect(infRes.ok).toBe(true);
    if (infRes.ok) {
      expect(infRes.report.resultTitle).toContain('VÔ SỐ NGHIỆM');
      expect(infRes.report.verification?.passed).toBe(true);
    }

    // Inconsistent system
    const noSolRes = executeCalculation({
      operationId: 'linear-system',
      matrixA: [
        ['1', '2'],
        ['2', '4'],
      ],
      matrixB: [['3'], ['7']],
      systemMethod: 'gauss',
      computationMode: 'exact',
    });
    expect(noSolRes.ok).toBe(true);
    if (noSolRes.ok) {
      expect(noSolRes.report.resultTitle).toContain('VÔ NGHIỆM');
    }
  });

  it('tìm không gian nghiệm, không gian hàng/cột và kiểm tra độc lập tuyến tính', () => {
    const A = [
      ['1', '2', '3'],
      ['2', '4', '6'],
      ['1', '1', '2'],
    ];
    const nsRes = executeCalculation({
      operationId: 'solution-space',
      matrixA: A,
      computationMode: 'exact',
    });
    expect(nsRes.ok).toBe(true);
    if (nsRes.ok) {
      expect(nsRes.report.resultTitle).toContain('số chiều 1');
      expect(nsRes.report.verification?.passed).toBe(true);
      expect(nsRes.report.verification?.residualNorm).toBe(0);
    }

    const depRes = executeCalculation({
      operationId: 'linear-independence',
      matrixA: A,
      computationMode: 'exact',
    });
    expect(depRes.ok).toBe(true);
    if (depRes.ok) {
      expect(depRes.report.resultTitle).toContain('PHỤ THUỘC TUYẾN TÍNH');
    }

    const rcRes = executeCalculation({
      operationId: 'row-col-space',
      matrixA: A,
      computationMode: 'exact',
    });
    expect(rcRes.ok).toBe(true);
    if (rcRes.ok) {
      expect(rcRes.report.resultTitle).toContain('rank(A) = 2');
    }
  });

  it('thực hiện phân tích LU, QR và Cholesky với kiểm chứng sai số dư', () => {
    const spd = [
      ['4', '12', '-16'],
      ['12', '37', '-43'],
      ['-16', '-43', '98'],
    ];

    const luRes = executeCalculation({
      operationId: 'lu',
      matrixA: spd,
      computationMode: 'exact',
    });
    expect(luRes.ok).toBe(true);
    if (luRes.ok) {
      expect(luRes.report.verification?.passed).toBe(true);
      expect(luRes.report.verification?.residualNorm).toBe(0);
    }

    const qrRes = executeCalculation({
      operationId: 'qr',
      matrixA: [
        ['1', '1'],
        ['1', '0'],
        ['0', '1'],
      ],
      computationMode: 'auto',
    });
    expect(qrRes.ok).toBe(true);
    if (qrRes.ok) {
      expect(qrRes.report.verification?.passed).toBe(true);
    }

    const cholRes = executeCalculation({
      operationId: 'cholesky',
      matrixA: spd,
      computationMode: 'auto',
    });
    expect(cholRes.ok).toBe(true);
    if (cholRes.ok) {
      expect(cholRes.report.verification?.passed).toBe(true);
      expect(cholRes.report.resultMatrix?.entries).toEqual([
        ['2', '0', '0'],
        ['6', '1', '0'],
        ['-8', '5', '3'],
      ]);
    }
  });

  it('tính trị riêng, vectơ riêng (bao gồm bội lặp & trị riêng phức) và chéo hóa ma trận', () => {
    // Symmetric matrix with distinct eigenvalues 5, 2, -1
    const diagTarget = [
      ['4', '1', '0'],
      ['1', '4', '0'],
      ['0', '0', '-1'],
    ];
    const eigRes = executeCalculation({
      operationId: 'eigen',
      matrixA: diagTarget,
      computationMode: 'auto',
    });
    expect(eigRes.ok).toBe(true);
    if (eigRes.ok) {
      expect(eigRes.report.eigenPairs?.length).toBe(3);
      expect(eigRes.report.verification?.passed).toBe(true);
    }

    const diagRes = executeCalculation({
      operationId: 'diagonalization',
      matrixA: diagTarget,
      computationMode: 'auto',
    });
    expect(diagRes.ok).toBe(true);
    if (diagRes.ok) {
      expect(diagRes.report.conditionsCheck.met).toBe(true);
      expect(diagRes.report.verification?.passed).toBe(true);
    }

    // 2x2 rotation matrix with complex eigenvalues ±i
    const complexEig = executeCalculation({
      operationId: 'eigen',
      matrixA: [
        ['0', '-1'],
        ['1', '0'],
      ],
      computationMode: 'auto',
    });
    expect(complexEig.ok).toBe(true);
    if (complexEig.ok) {
      expect(complexEig.report.eigenPairs?.every((p) => p.isComplex)).toBe(true);
    }

    // Non-diagonalizable defective Jordan block [[2,1],[0,2]]
    const defective = executeCalculation({
      operationId: 'diagonalization',
      matrixA: [
        ['2', '1'],
        ['0', '2'],
      ],
      computationMode: 'auto',
    });
    expect(defective.ok).toBe(true);
    if (defective.ok) {
      expect(defective.report.conditionsCheck.met).toBe(false);
    }
  });
});
