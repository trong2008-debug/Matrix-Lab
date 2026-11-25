import React from 'react';
import { ArrowLeftRight, Play, RotateCcw, Trash2 } from 'lucide-react';
import {
  ComputationMode,
  DeterminantMethod,
  LinearSystemMethod,
  OperationId,
} from '@/src/types/math';
import { useMatrixLabStore } from '@/src/store/useMatrixLabStore';
import { MatrixEditor } from '@/src/components/matrix-editor/MatrixEditor';
import { ResultPanel } from '@/src/components/result-panel/ResultPanel';

interface ToolMetadata {
  title: string;
  description: string;
  twoMatrices: boolean;
  matrixALabel?: string;
  matrixBLabel?: string;
}

const TOOL_META: Record<string, ToolMetadata> = {
  calculator: {
    title: 'Máy tính ma trận tổng hợp',
    description: 'Chọn nhanh phép toán trên các ma trận đang làm việc với số học chính xác hoặc xấp xỉ.',
    twoMatrices: true,
  },
  'add-sub': {
    title: 'Cộng và trừ ma trận (A ± B)',
    description: 'Tính tổng hoặc hiệu hai ma trận có cùng kích thước theo từng phần tử tương ứng.',
    twoMatrices: true,
  },
  multiply: {
    title: 'Phép nhân ma trận (AB)',
    description: 'Nhân ma trận A (m × n) với ma trận B (n × p) theo quy tắc hàng nhân cột.',
    twoMatrices: true,
  },
  'scalar-multiply': {
    title: 'Nhân ma trận với số vô hướng (kA)',
    description: 'Nhân toàn bộ các phần tử của ma trận A với hằng số thực hoặc phân số k.',
    twoMatrices: false,
  },
  power: {
    title: 'Lũy thừa ma trận (Aⁿ)',
    description: 'Tính Aⁿ cho ma trận vuông bằng thuật toán bình phương và nhân nhị phân (hỗ trợ n âm nếu A khả nghịch).',
    twoMatrices: false,
  },
  equality: {
    title: 'So sánh hai ma trận (A = B)',
    description: 'Kiểm tra hai ma trận có bằng nhau chính xác (phân số) hoặc xấp xỉ trong ngưỡng sai số.',
    twoMatrices: true,
  },
  determinant: {
    title: 'Tính định thức (det A)',
    description: 'Tính định thức ma trận vuông bằng khai triển Laplace, khử Gauss hoặc phân tích LU.',
    twoMatrices: false,
  },
  rank: {
    title: 'Tính hạng ma trận (rank A)',
    description: 'Đưa ma trận về dạng bậc thang và đếm số phần tử trụ / hàng khác không.',
    twoMatrices: false,
  },
  trace: {
    title: 'Tính vết ma trận (tr A)',
    description: 'Tính tổng các phần tử nằm trên đường chéo chính của ma trận vuông.',
    twoMatrices: false,
  },
  invertibility: {
    title: 'Kiểm tra tính khả nghịch',
    description: 'Đánh giá ma trận vuông có khả nghịch hay không thông qua định thức và hạng ma trận.',
    twoMatrices: false,
  },
  classify: {
    title: 'Phân loại ma trận',
    description: 'Kiểm tra các lớp: đối xứng, phản đối xứng, trực giao, tam giác, đường chéo, đơn vị, không, xác định dương.',
    twoMatrices: false,
  },
  transpose: {
    title: 'Ma trận chuyển vị (Aᵀ)',
    description: 'Hoán đổi chỉ số hàng và cột của ma trận A cỡ m × n thành cỡ n × m.',
    twoMatrices: false,
  },
  inverse: {
    title: 'Tìm ma trận nghịch đảo (A⁻¹)',
    description: 'Biến đổi [A | I] → [I | A⁻¹] bằng phương pháp Gauss-Jordan kèm kiểm chứng AA⁻¹ = I.',
    twoMatrices: false,
  },
  adjugate: {
    title: 'Tìm ma trận phụ hợp (adj A)',
    description: 'Tính ma trận phần bù đại số C và chuyển vị Cᵀ, kiểm chứng hệ thức A·adj(A) = det(A)I.',
    twoMatrices: false,
  },
  ref: {
    title: 'Dạng bậc thang (REF)',
    description: 'Thực hiện các phép biến đổi sơ cấp trên hàng (khử Gauss) để đưa ma trận về dạng bậc thang.',
    twoMatrices: false,
  },
  rref: {
    title: 'Dạng bậc thang rút gọn (RREF)',
    description: 'Thực hiện thuật toán Gauss-Jordan để đưa các trụ về 1 và khử toàn bộ các phần tử khác trong cột trụ.',
    twoMatrices: false,
  },
  'linear-system': {
    title: 'Giải hệ phương trình tuyến tính (AX = B)',
    description: 'Giải và biện luận hệ phương trình tuyến tính theo định lý Kronecker-Capelli (nghiệm duy nhất, vô số nghiệm tham số, vô nghiệm).',
    twoMatrices: true,
    matrixALabel: 'A — Ma trận hệ số',
    matrixBLabel: 'B — Vế phải',
  },
  eigen: {
    title: 'Trị riêng và vectơ riêng',
    description: 'Tìm đa thức đặc trưng (Faddeev-LeVerrier), trị riêng (Hessenberg + QR dịch chuyển) và cơ sở không gian riêng.',
    twoMatrices: false,
  },
  'solution-space': {
    title: 'Không gian nghiệm thuần nhất N(A)',
    description: 'Tìm cơ sở và số chiều của không gian hạt nhân (nghiệm hệ Ax = 0).',
    twoMatrices: false,
  },
  'row-col-space': {
    title: 'Không gian hàng và không gian cột',
    description: 'Xác định cơ sở và số chiều của không gian hàng R(A) và không gian cột C(A).',
    twoMatrices: false,
  },
  'linear-independence': {
    title: 'Kiểm tra độc lập và phụ thuộc tuyến tính',
    description: 'Kiểm tra hệ các vectơ cột của ma trận A độc lập hay phụ thuộc tuyến tính (và chỉ ra tổ hợp phụ thuộc nếu có).',
    twoMatrices: false,
  },
  'basis-dimension': {
    title: 'Cơ sở và số chiều',
    description: 'Kiểm tra hệ vectơ cột có tạo thành cơ sở của Rᵐ hay không và rút trích cơ sở của không gian sinh.',
    twoMatrices: false,
  },
  lu: {
    title: 'Phân tích LU (PA = LU)',
    description: 'Phân tích ma trận vuông thành tích ma trận tam giác dưới L và tam giác trên U với hoán vị hàng P.',
    twoMatrices: false,
  },
  qr: {
    title: 'Phân tích QR (A = QR)',
    description: 'Phân tích A = QR bằng quá trình trực chuẩn hóa Gram-Schmidt cải tiến (yêu cầu m ≥ n và các cột độc lập tuyến tính).',
    twoMatrices: false,
  },
  cholesky: {
    title: 'Phân tích Cholesky (A = LLᵀ)',
    description: 'Phân tích ma trận đối xứng xác định dương thành tích ma trận tam giác dưới L và chuyển vị Lᵀ.',
    twoMatrices: false,
  },
  diagonalization: {
    title: 'Chéo hóa ma trận (A = PDP⁻¹)',
    description: 'Tìm ma trận làm chéo P và ma trận đường chéo D khi ma trận có đủ n vectơ riêng thực độc lập tuyến tính.',
    twoMatrices: false,
  },
};

const QUICK_CALC_OPS: { id: OperationId; label: string; subOp?: 'add' | 'subtract' }[] = [
  { id: 'add-sub', subOp: 'add', label: 'A + B' },
  { id: 'add-sub', subOp: 'subtract', label: 'A - B' },
  { id: 'multiply', label: 'A × B' },
  { id: 'determinant', label: 'det(A)' },
  { id: 'inverse', label: 'A⁻¹' },
  { id: 'rank', label: 'rank(A)' },
  { id: 'transpose', label: 'Aᵀ' },
  { id: 'rref', label: 'RREF(A)' },
  { id: 'linear-system', label: 'Giải AX=B' },
  { id: 'eigen', label: 'Trị riêng' },
];

export const WorkspacePage: React.FC = () => {
  const {
    activeRoute,
    matrices,
    slotAId,
    slotBId,
    subOp,
    scalarText,
    exponent,
    detMethod,
    systemMethod,
    settings,
    currentReport,
    currentError,
    setSubOp,
    setScalarText,
    setExponent,
    setDetMethod,
    setSystemMethod,
    swapSlotMatrices,
    updateSettings,
    updateMatrixData,
    runCalculation,
    clearResult,
  } = useMatrixLabStore();

  const [calcOp, setCalcOp] = React.useState<OperationId>('multiply');
  const effectiveOp = activeRoute === 'calculator' ? calcOp : activeRoute;
  const meta = TOOL_META[activeRoute] ?? TOOL_META.calculator;
  const showSecondMatrix =
    activeRoute === 'calculator'
      ? calcOp === 'add-sub' || calcOp === 'multiply' || calcOp === 'equality' || calcOp === 'linear-system'
      : meta.twoMatrices;

  const matA = matrices.find((m) => m.id === slotAId) ?? matrices[0];
  const matB = matrices.find((m) => m.id === slotBId) ?? matrices[1] ?? matrices[0];

  const handleResetInputs = () => {
    updateMatrixData(
      matA.id,
      Array.from({ length: matA.rows }, (_, r) =>
        Array.from({ length: matA.cols }, (__, c) => (r === c ? '1' : '0'))
      )
    );
    if (showSecondMatrix && matB.id !== matA.id) {
      updateMatrixData(
        matB.id,
        Array.from({ length: matB.rows }, (_, r) =>
          Array.from({ length: matB.cols }, (__, c) => (r === c ? '1' : '0'))
        )
      );
    }
    clearResult();
  };

  const handleClearData = () => {
    updateMatrixData(
      matA.id,
      Array.from({ length: matA.rows }, () => Array.from({ length: matA.cols }, () => '0'))
    );
    if (showSecondMatrix && matB.id !== matA.id) {
      updateMatrixData(
        matB.id,
        Array.from({ length: matB.rows }, () => Array.from({ length: matB.cols }, () => '0'))
      );
    }
    clearResult();
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Controls Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E7EB] pb-4 dark:border-[#303642]">
        <div className="space-y-1 max-w-2xl">
          <h1 className="font-display text-xl font-bold tracking-tight text-[#17191F] dark:text-[#F3F4F6]">
            {meta.title}
          </h1>
          <p className="text-sm text-[#697386] dark:text-[#9CA3AF]">{meta.description}</p>
        </div>

        {/* Computation Mode Selector */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="comp-mode-select"
            className="text-xs font-medium text-[#697386] dark:text-[#9CA3AF] whitespace-nowrap"
          >
            Chế độ:
          </label>
          <select
            id="comp-mode-select"
            value={settings.computationMode}
            onChange={(e) => updateSettings({ computationMode: e.target.value as ComputationMode })}
            className="h-8 rounded border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#17191F] focus:border-[#2563EB] focus:outline-none dark:border-[#303642] dark:bg-[#191C23] dark:text-[#F3F4F6]"
          >
            <option value="auto">Tự động (ưu tiên phân số)</option>
            <option value="exact">Phân số chính xác</option>
            <option value="numerical">Xấp xỉ số học</option>
          </select>
        </div>
      </div>

      {/* Operation-specific quick bar when in Matrix Calculator mode */}
      {activeRoute === 'calculator' && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white p-2 dark:border-[#303642] dark:bg-[#191C23]">
          {QUICK_CALC_OPS.map((op) => {
            const selected =
              calcOp === op.id && (op.id !== 'add-sub' || subOp === op.subOp);
            return (
              <button
                key={op.label}
                type="button"
                onClick={() => {
                  if (op.subOp) setSubOp(op.subOp);
                  setCalcOp(op.id);
                }}
                className={`h-8 rounded px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  selected
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#F8F9FB] text-[#17191F] hover:bg-[#F1F3F7] dark:bg-[#20242D] dark:text-[#F3F4F6] dark:hover:bg-[#303642]'
                }`}
              >
                {op.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Matrix Input Section */}
      <div className={`grid gap-4 ${showSecondMatrix ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
        <MatrixEditor
          matrix={matA}
          slotRole="A"
          label={meta.matrixALabel}
          error={currentError}
        />
        {showSecondMatrix && (
          <MatrixEditor
            matrix={matB}
            slotRole="B"
            label={meta.matrixBLabel}
            error={currentError}
          />
        )}
      </div>

      {/* Operation Parameters & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 dark:border-[#303642] dark:bg-[#191C23]">
        <div className="flex flex-wrap items-center gap-3">
          {effectiveOp === 'add-sub' && (
            <div className="inline-flex rounded-md bg-[#F1F3F7] p-0.5 dark:bg-[#20242D]">
              <button
                type="button"
                onClick={() => setSubOp('add')}
                className={`rounded px-3 py-1 text-xs font-medium ${
                  subOp === 'add'
                    ? 'bg-white text-[#17191F] shadow-xs dark:bg-[#191C23] dark:text-[#F3F4F6]'
                    : 'text-[#697386] dark:text-[#9CA3AF]'
                }`}
              >
                Phép cộng (A + B)
              </button>
              <button
                type="button"
                onClick={() => setSubOp('subtract')}
                className={`rounded px-3 py-1 text-xs font-medium ${
                  subOp === 'subtract'
                    ? 'bg-white text-[#17191F] shadow-xs dark:bg-[#191C23] dark:text-[#F3F4F6]'
                    : 'text-[#697386] dark:text-[#9CA3AF]'
                }`}
              >
                Phép trừ (A - B)
              </button>
            </div>
          )}

          {effectiveOp === 'scalar-multiply' && (
            <label className="flex items-center gap-2 text-xs font-medium text-[#17191F] dark:text-[#F3F4F6]">
              <span>Hệ số vô hướng k =</span>
              <input
                type="text"
                value={scalarText}
                onChange={(e) => setScalarText(e.target.value)}
                placeholder="vd: -3/2"
                className="h-8 w-28 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2.5 font-mono text-sm text-[#17191F] focus:border-[#2563EB] focus:outline-none dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
              />
            </label>
          )}

          {effectiveOp === 'power' && (
            <label className="flex items-center gap-2 text-xs font-medium text-[#17191F] dark:text-[#F3F4F6]">
              <span>Số mũ nguyên n =</span>
              <input
                type="number"
                min={-20}
                max={20}
                value={exponent}
                onChange={(e) => setExponent(parseInt(e.target.value, 10) || 0)}
                className="h-8 w-24 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2.5 font-mono text-sm text-[#17191F] focus:border-[#2563EB] focus:outline-none dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
              />
            </label>
          )}

          {effectiveOp === 'determinant' && (
            <label className="flex items-center gap-2 text-xs font-medium text-[#17191F] dark:text-[#F3F4F6]">
              <span>Thuật toán:</span>
              <select
                value={detMethod}
                onChange={(e) => setDetMethod(e.target.value as DeterminantMethod)}
                className="h-8 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2.5 text-xs text-[#17191F] focus:border-[#2563EB] focus:outline-none dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
              >
                <option value="auto">Tự động (tối ưu theo cấp)</option>
                <option value="gauss">Khử Gauss</option>
                <option value="laplace">Khai triển Laplace (cấp ≤ 6)</option>
                <option value="lu">Phân tích PA = LU</option>
              </select>
            </label>
          )}

          {effectiveOp === 'linear-system' && (
            <label className="flex items-center gap-2 text-xs font-medium text-[#17191F] dark:text-[#F3F4F6]">
              <span>Phương pháp giải:</span>
              <select
                value={systemMethod}
                onChange={(e) => setSystemMethod(e.target.value as LinearSystemMethod)}
                className="h-8 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2.5 text-xs text-[#17191F] focus:border-[#2563EB] focus:outline-none dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
              >
                <option value="gauss-jordan">Khử Gauss-Jordan</option>
                <option value="gauss">Khử Gauss (thế ngược)</option>
                <option value="cramer">Quy tắc Cramer</option>
                <option value="inverse">Ma trận nghịch đảo (X = A⁻¹B)</option>
              </select>
            </label>
          )}

          {showSecondMatrix && (
            <button
              type="button"
              onClick={swapSlotMatrices}
              className="inline-flex h-8 items-center gap-1.5 rounded border border-[#E5E7EB] px-2.5 text-xs font-medium text-[#697386] hover:bg-[#F1F3F7] hover:text-[#17191F] dark:border-[#303642] dark:text-[#9CA3AF] dark:hover:bg-[#20242D] dark:hover:text-[#F3F4F6] whitespace-nowrap"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Hoán đổi A và B
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleClearData}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#E5E7EB] px-3 text-xs font-medium text-[#697386] hover:bg-[#F1F3F7] hover:text-[#17191F] dark:border-[#303642] dark:text-[#9CA3AF] dark:hover:bg-[#20242D] dark:hover:text-[#F3F4F6] whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa dữ liệu
          </button>

          <button
            type="button"
            onClick={handleResetInputs}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#E5E7EB] px-3 text-xs font-medium text-[#17191F] hover:bg-[#F1F3F7] dark:border-[#303642] dark:text-[#F3F4F6] dark:hover:bg-[#20242D] whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Đặt lại
          </button>

          <button
            type="button"
            onClick={() => runCalculation(effectiveOp)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2563EB] px-5 text-xs font-semibold text-white hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] whitespace-nowrap"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Tính toán
          </button>
        </div>
      </div>

      {/* Result & Step-by-Step Solution Panel */}
      <ResultPanel report={currentReport} error={currentError} />
    </div>
  );
};
