export interface Rational {
  readonly num: bigint;
  readonly den: bigint;
}

export type Scalar =
  | { readonly kind: 'rational'; readonly value: Rational }
  | { readonly kind: 'number'; readonly value: number };

export interface ComplexNumber {
  readonly re: number;
  readonly im: number;
}

export type ComputationMode = 'auto' | 'exact' | 'numerical';
export type ResolvedComputationMode = 'exact' | 'numerical';
export type SolutionDisplayMode = 'result' | 'summary' | 'detailed';

export type OperationId =
  | 'home'
  | 'calculator'
  | 'history'
  | 'add-sub'
  | 'multiply'
  | 'scalar-multiply'
  | 'power'
  | 'equality'
  | 'determinant'
  | 'rank'
  | 'trace'
  | 'invertibility'
  | 'classify'
  | 'transpose'
  | 'inverse'
  | 'adjugate'
  | 'ref'
  | 'rref'
  | 'linear-system'
  | 'eigen'
  | 'solution-space'
  | 'row-col-space'
  | 'linear-independence'
  | 'basis-dimension'
  | 'lu'
  | 'qr'
  | 'cholesky'
  | 'diagonalization'
  | 'settings';

export type DeterminantMethod = 'auto' | 'gauss' | 'laplace' | 'lu';
export type LinearSystemMethod = 'gauss' | 'gauss-jordan' | 'cramer' | 'inverse';

export interface NamedMatrix {
  id: string;
  name: string;
  rows: number;
  cols: number;
  data: string[][];
  createdAt: number;
  updatedAt: number;
}

export interface MatrixDisplayData {
  rows: number;
  cols: number;
  entries: string[][];
  latex: string;
  augmentedSplitCol?: number;
}

export interface CalculationStep {
  stepNumber: number;
  stage: string;
  isMajorStage?: boolean;
  operationNotation?: string;
  explanation: string;
  matrixBefore?: MatrixDisplayData;
  matrixAfter?: MatrixDisplayData;
  augmentedSplitCol?: number;
  highlightedRows?: number[];
  highlightedCols?: number[];
  pivotCell?: [number, number];
  formulaLatex?: string;
}

export interface ConditionCheckItem {
  label: string;
  satisfied: boolean;
  detail: string;
}

export interface VerificationResult {
  passed: boolean;
  label: string;
  formulaLatex: string;
  residualNorm?: number;
  detail: string;
}

export interface ClassificationItem {
  key: string;
  name: string;
  satisfied: boolean;
  criterion: string;
  explanation: string;
}

export interface EigenPairSummary {
  index: number;
  eigenvalueLatex: string;
  eigenvalueText: string;
  isComplex: boolean;
  algebraicMultiplicity?: number;
  geometricMultiplicity?: number;
  eigenvectorsLatex: string[];
  eigenvectorsText: string[][];
  verificationResidual?: number;
}

export interface CalculationReport {
  id: string;
  operationId: OperationId;
  operationName: string;
  algorithmName: string;
  modeUsed: ResolvedComputationMode;
  isExactResult: boolean;
  problemStatementLatex: string;
  inputMatrices: { name: string; rows: number; cols: number; display: MatrixDisplayData }[];
  extraParamsText?: string;
  conditionsCheck: {
    met: boolean;
    items: ConditionCheckItem[];
  };
  steps: CalculationStep[];
  resultTitle: string;
  resultLatex: string;
  resultText: string;
  resultMatrix?: MatrixDisplayData;
  secondaryMatrices?: { label: string; symbol: string; matrix: MatrixDisplayData }[];
  classifications?: ClassificationItem[];
  eigenPairs?: EigenPairSummary[];
  verification?: VerificationResult;
  conclusion: string;
  limitations?: string[];
  durationMs: number;
}

export interface StructuredMathError {
  code:
    | 'EMPTY_CELL'
    | 'INVALID_SCALAR'
    | 'DIMENSION_MISMATCH'
    | 'NOT_SQUARE'
    | 'SINGULAR_MATRIX'
    | 'INVALID_EXPONENT'
    | 'UNSUPPORTED_OPERATION'
    | 'NUMERIC_INSTABILITY'
    | 'NOT_POSITIVE_DEFINITE'
    | 'NOT_SYMMETRIC'
    | 'INVALID_DIMENSIONS';
  message: string;
  detail?: string;
  cell?: { matrixName: string; row: number; col: number };
}

export interface HistoryRecord {
  id: string;
  customName?: string;
  operationId: OperationId;
  operationName: string;
  algorithmName: string;
  modeUsed: ResolvedComputationMode;
  isExactResult: boolean;
  matrixDimensionsSummary: string;
  resultPreviewLatex: string;
  resultPreviewText: string;
  inputsSnapshot: {
    matrices: { name: string; rows: number; cols: number; data: string[][] }[];
    scalarText?: string;
    exponent?: number;
    method?: string;
  };
  report: CalculationReport;
  timestamp: number;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  computationMode: ComputationMode;
  decimalPrecision: number;
  numericalTolerance: number;
  defaultDisplayMode: SolutionDisplayMode;
}
