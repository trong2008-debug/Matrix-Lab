import {
  CalculationReport,
  ComputationMode,
  DeterminantMethod,
  LinearSystemMethod,
  OperationId,
  StructuredMathError,
} from '@/src/types/math';
import {
  DEFAULT_PRECISION,
  DEFAULT_TOLERANCE,
  parseMatrixRaw,
  parseScalar,
  resolveComputationMode,
} from '@/src/algorithms/arithmetic/scalar';
import {
  buildAddSubReport,
  buildEqualityReport,
  buildMultiplyReport,
  buildPowerReport,
  buildScalarMultiplyReport,
} from '@/src/algorithms/arithmetic/matrixOps';
import { buildDeterminantReport } from '@/src/algorithms/determinant/determinant';
import {
  buildClassifyReport,
  buildInvertibilityReport,
  buildRankReport,
  buildTraceReport,
  buildTransposeReport,
} from '@/src/algorithms/matrix/properties';
import { buildAdjugateReport, buildInverseReport } from '@/src/algorithms/inverse/inverse';
import { buildEchelonReport } from '@/src/algorithms/elimination/echelon';
import { buildLinearSystemReport } from '@/src/algorithms/linear-systems/linearSystems';
import {
  buildLinearIndependenceReport,
  buildRowColSpaceReport,
  buildSolutionSpaceReport,
} from '@/src/algorithms/vector-spaces/vectorSpaces';
import {
  buildCholeskyReport,
  buildLUReport,
  buildQRReport,
} from '@/src/algorithms/decomposition/decompositions';
import { buildDiagonalizationReport, buildEigenReport } from '@/src/algorithms/eigenvalues/eigen';

export interface ExecuteCalculationParams {
  operationId: OperationId;
  matrixA: string[][];
  matrixB?: string[][];
  subOp?: 'add' | 'subtract';
  scalarText?: string;
  exponent?: number;
  detMethod?: DeterminantMethod;
  systemMethod?: LinearSystemMethod;
  computationMode: ComputationMode;
  precision?: number;
  tolerance?: number;
}

export type CalculationOutcome =
  | { ok: true; report: CalculationReport }
  | { ok: false; error: StructuredMathError };

export function executeCalculation(params: ExecuteCalculationParams): CalculationOutcome {
  const {
    operationId,
    matrixA,
    matrixB,
    subOp = 'add',
    scalarText = '2',
    exponent = 2,
    detMethod = 'auto',
    systemMethod = 'gauss-jordan',
    computationMode,
    precision = DEFAULT_PRECISION,
    tolerance = DEFAULT_TOLERANCE,
  } = params;

  const isTwoMatrixOp =
    operationId === 'add-sub' ||
    operationId === 'multiply' ||
    operationId === 'equality' ||
    operationId === 'linear-system';

  const forceNumerical =
    operationId === 'qr' ||
    operationId === 'cholesky' ||
    operationId === 'eigen' ||
    operationId === 'diagonalization';

  const rawList = isTwoMatrixOp && matrixB ? [matrixA, matrixB] : [matrixA];
  const resolvedMode = resolveComputationMode(computationMode, rawList, forceNumerical);

  const parsedA = parseMatrixRaw(matrixA, 'A', resolvedMode);
  if (!parsedA.ok) {
    return parsedA;
  }

  let parsedBMatrix = undefined;
  if (isTwoMatrixOp) {
    if (!matrixB) {
      return {
        ok: false,
        error: {
          code: 'EMPTY_CELL',
          message: 'Thiếu dữ liệu ma trận B.',
        },
      };
    }
    const parsedB = parseMatrixRaw(matrixB, operationId === 'linear-system' ? 'B' : 'B', resolvedMode);
    if (!parsedB.ok) {
      return parsedB;
    }
    parsedBMatrix = parsedB.matrix;
  }

  const A = parsedA.matrix;

  switch (operationId) {
    case 'add-sub':
      return {
        ok: true,
        report: buildAddSubReport(A, parsedBMatrix!, subOp === 'subtract', resolvedMode, precision, tolerance),
      };
    case 'multiply':
      return {
        ok: true,
        report: buildMultiplyReport(A, parsedBMatrix!, resolvedMode, precision, tolerance),
      };
    case 'scalar-multiply': {
      const k = parseScalar(scalarText, resolvedMode);
      if (!k) {
        return {
          ok: false,
          error: {
            code: 'INVALID_SCALAR',
            message: 'Hệ số vô hướng k không hợp lệ.',
            detail: `Giá trị "${scalarText}" không phải số thực hoặc phân số hợp lệ.`,
          },
        };
      }
      return {
        ok: true,
        report: buildScalarMultiplyReport(k, A, resolvedMode, precision, tolerance),
      };
    }
    case 'power': {
      if (!Number.isInteger(exponent)) {
        return {
          ok: false,
          error: {
            code: 'INVALID_EXPONENT',
            message: 'Số mũ phải là số nguyên.',
          },
        };
      }
      if (Math.abs(exponent) > 50) {
        return {
          ok: false,
          error: {
            code: 'INVALID_EXPONENT',
            message: 'Số mũ quá lớn (giới hạn |n| ≤ 50 để tránh tràn phân số hoặc số học).',
          },
        };
      }
      return {
        ok: true,
        report: buildPowerReport(A, exponent, resolvedMode, precision, tolerance),
      };
    }
    case 'equality':
      return {
        ok: true,
        report: buildEqualityReport(A, parsedBMatrix!, resolvedMode, precision, tolerance),
      };
    case 'determinant':
      return {
        ok: true,
        report: buildDeterminantReport(A, detMethod, resolvedMode, precision, tolerance),
      };
    case 'rank':
      return {
        ok: true,
        report: buildRankReport(A, resolvedMode, precision, tolerance),
      };
    case 'trace':
      return {
        ok: true,
        report: buildTraceReport(A, resolvedMode, precision, tolerance),
      };
    case 'invertibility':
      return {
        ok: true,
        report: buildInvertibilityReport(A, resolvedMode, precision, tolerance),
      };
    case 'classify':
      return {
        ok: true,
        report: buildClassifyReport(A, resolvedMode, precision, tolerance),
      };
    case 'transpose':
      return {
        ok: true,
        report: buildTransposeReport(A, resolvedMode, precision, tolerance),
      };
    case 'inverse':
      return {
        ok: true,
        report: buildInverseReport(A, resolvedMode, precision, tolerance),
      };
    case 'adjugate':
      return {
        ok: true,
        report: buildAdjugateReport(A, resolvedMode, precision, tolerance),
      };
    case 'ref':
      return {
        ok: true,
        report: buildEchelonReport(A, false, resolvedMode, precision, tolerance),
      };
    case 'rref':
      return {
        ok: true,
        report: buildEchelonReport(A, true, resolvedMode, precision, tolerance),
      };
    case 'linear-system':
      return {
        ok: true,
        report: buildLinearSystemReport(A, parsedBMatrix!, systemMethod, resolvedMode, precision, tolerance),
      };
    case 'eigen':
      return {
        ok: true,
        report: buildEigenReport(A, resolvedMode, precision, tolerance),
      };
    case 'solution-space':
      return {
        ok: true,
        report: buildSolutionSpaceReport(A, resolvedMode, precision, tolerance),
      };
    case 'row-col-space':
      return {
        ok: true,
        report: buildRowColSpaceReport(A, resolvedMode, precision, tolerance),
      };
    case 'linear-independence':
      return {
        ok: true,
        report: buildLinearIndependenceReport(A, false, resolvedMode, precision, tolerance),
      };
    case 'basis-dimension':
      return {
        ok: true,
        report: buildLinearIndependenceReport(A, true, resolvedMode, precision, tolerance),
      };
    case 'lu':
      return {
        ok: true,
        report: buildLUReport(A, resolvedMode, precision, tolerance),
      };
    case 'qr':
      return {
        ok: true,
        report: buildQRReport(A, precision, tolerance),
      };
    case 'cholesky':
      return {
        ok: true,
        report: buildCholeskyReport(A, precision, tolerance),
      };
    case 'diagonalization':
      return {
        ok: true,
        report: buildDiagonalizationReport(A, precision, tolerance),
      };
    default:
      return {
        ok: false,
        error: {
          code: 'UNSUPPORTED_OPERATION',
          message: 'Phép toán chưa được hỗ trợ.',
        },
      };
  }
}
