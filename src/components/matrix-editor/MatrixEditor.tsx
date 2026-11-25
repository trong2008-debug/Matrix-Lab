import React, { useRef, useState } from 'react';
import {
  Copy,
  FileText,
  Grid3X3,
  Minus,
  Plus,
  RotateCcw,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { NamedMatrix, StructuredMathError } from '@/src/types/math';
import { useMatrixLabStore } from '@/src/store/useMatrixLabStore';

interface MatrixEditorProps {
  matrix: NamedMatrix;
  label?: string;
  slotRole?: 'A' | 'B';
  error?: StructuredMathError | null;
}

export function parseMatrixTextInput(text: string): string[][] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  const rows = lines.map((line) => {
    // Support comma, semicolon, tab, or multiple spaces
    const cleaned = line.replace(/^\[|\]$/g, '').trim();
    if (cleaned.includes('\t')) {
      return cleaned.split('\t').map((c) => c.trim());
    }
    if (cleaned.includes(';')) {
      return cleaned.split(';').map((c) => c.trim());
    }
    if (cleaned.includes(',')) {
      return cleaned.split(',').map((c) => c.trim());
    }
    return cleaned.split(/\s+/).map((c) => c.trim());
  });

  const maxCols = Math.max(...rows.map((r) => r.length));
  if (maxCols === 0) return null;
  const clampedRows = rows.slice(0, 10);
  const clampedCols = Math.min(maxCols, 10);
  return clampedRows.map((r) =>
    Array.from({ length: clampedCols }, (_, c) => r[c] ?? '0')
  );
}

const PRESET_EXAMPLES: { label: string; rows: number; cols: number; data: string[][] }[] = [
  {
    label: 'Khả nghịch 3×3',
    rows: 3,
    cols: 3,
    data: [
      ['2', '1', '-1'],
      ['-3', '-1', '2'],
      ['-2', '1', '2'],
    ],
  },
  {
    label: 'Phân số 3×3',
    rows: 3,
    cols: 3,
    data: [
      ['1/2', '1/3', '1'],
      ['1/4', '1/2', '2'],
      ['0', '1/3', '3/2'],
    ],
  },
  {
    label: 'Xác định dương 3×3',
    rows: 3,
    cols: 3,
    data: [
      ['4', '12', '-16'],
      ['12', '37', '-43'],
      ['-16', '-43', '98'],
    ],
  },
  {
    label: 'Suy biến (rank=2)',
    rows: 3,
    cols: 3,
    data: [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
    ],
  },
];

export const MatrixEditor: React.FC<MatrixEditorProps> = ({
  matrix,
  label,
  slotRole,
  error,
}) => {
  const {
    matrices,
    updateMatrixData,
    resizeMatrix,
    createMatrix,
    renameMatrix,
    duplicateMatrix,
    removeMatrix,
    setSlotAId,
    setSlotBId,
    showToast,
  } = useMatrixLabStore();

  const [textMode, setTextMode] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(matrix.name);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const handleCellChange = (r: number, c: number, val: string) => {
    const next = matrix.data.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row
    );
    updateMatrixData(matrix.id, next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const rows = matrix.rows;
    const cols = matrix.cols;
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextR = (r + 1) % rows;
      const nextC = r + 1 >= rows ? (c + 1) % cols : c;
      inputRefs.current[nextR]?.[nextC]?.focus();
      inputRefs.current[nextR]?.[nextC]?.select();
    } else if (e.key === 'ArrowDown') {
      if (r + 1 < rows) {
        e.preventDefault();
        inputRefs.current[r + 1]?.[c]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      if (r - 1 >= 0) {
        e.preventDefault();
        inputRefs.current[r - 1]?.[c]?.focus();
      }
    } else if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      if (c + 1 < cols) {
        e.preventDefault();
        inputRefs.current[r]?.[c + 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      if (c - 1 >= 0) {
        e.preventDefault();
        inputRefs.current[r]?.[c - 1]?.focus();
      }
    }
  };

  const handlePasteInGrid = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.includes('\n') || pasted.includes('\t') || pasted.includes(';')) {
      const parsed = parseMatrixTextInput(pasted);
      if (parsed) {
        e.preventDefault();
        updateMatrixData(matrix.id, parsed);
        showToast('Đã nhập dữ liệu ma trận từ bộ nhớ tạm.', 'success');
      }
    }
  };

  const openTextMode = () => {
    setTextDraft(matrix.data.map((r) => r.join('  ')).join('\n'));
    setTextMode(true);
  };

  const applyTextMode = () => {
    const parsed = parseMatrixTextInput(textDraft);
    if (!parsed) {
      showToast('Không thể phân tích dữ liệu văn bản thành ma trận.', 'error');
      return;
    }
    updateMatrixData(matrix.id, parsed);
    setTextMode(false);
    showToast('Đã áp dụng dữ liệu ma trận.', 'success');
  };

  const fillIdentity = () => {
    const n = matrix.rows;
    const grid = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (__, c) => (r === c ? '1' : '0'))
    );
    updateMatrixData(matrix.id, grid);
  };

  const fillZero = () => {
    const grid = Array.from({ length: matrix.rows }, () =>
      Array.from({ length: matrix.cols }, () => '0')
    );
    updateMatrixData(matrix.id, grid);
  };

  const fillRandom = () => {
    const grid = Array.from({ length: matrix.rows }, () =>
      Array.from({ length: matrix.cols }, () => String(Math.floor(Math.random() * 13) - 6))
    );
    updateMatrixData(matrix.id, grid);
  };

  const handleSelectMatrix = (selectedId: string) => {
    if (slotRole === 'A') setSlotAId(selectedId);
    else if (slotRole === 'B') setSlotBId(selectedId);
  };

  const handleCreateAndAssign = () => {
    const newId = createMatrix(undefined, matrix.rows, matrix.cols);
    if (slotRole === 'A') setSlotAId(newId);
    else if (slotRole === 'B') setSlotBId(newId);
  };

  const displayTitle = label ?? `${matrix.name} — Ma trận ${matrix.rows} × ${matrix.cols}`;

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-[#303642] dark:bg-[#191C23]">
      {/* Header row: Matrix identity + switcher + rename/duplicate/delete */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB] dark:border-[#303642]">
        <div className="flex items-center gap-2 min-w-0">
          {renaming ? (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                renameMatrix(matrix.id, nameDraft);
                setRenaming(false);
              }}
            >
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={16}
                autoFocus
                className="h-8 w-28 rounded border border-[#2563EB] bg-white px-2 text-sm font-medium text-[#17191F] focus:outline-none dark:bg-[#20242D] dark:text-[#F3F4F6]"
                aria-label="Tên ma trận mới"
              />
              <button
                type="submit"
                className="h-8 rounded bg-[#2563EB] px-2.5 text-xs font-medium text-white hover:bg-[#1D4ED8] whitespace-nowrap"
              >
                Lưu
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-semibold text-[#17191F] dark:text-[#F3F4F6] truncate">
                {displayTitle}
              </h3>
              <span className="text-xs text-[#697386] dark:text-[#9CA3AF] font-mono tabular-nums whitespace-nowrap">
                {matrix.rows} × {matrix.cols}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {slotRole && (
            <select
              value={matrix.id}
              onChange={(e) => handleSelectMatrix(e.target.value)}
              aria-label={`Chọn ma trận cho vị trí ${slotRole}`}
              className="h-8 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2 text-xs font-medium text-[#17191F] focus:border-[#2563EB] focus:outline-none dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
            >
              {matrices.map((m) => (
                <option key={m.id} value={m.id}>
                  Ma trận {m.name} ({m.rows}×{m.cols})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={handleCreateAndAssign}
            title="Tạo ma trận mới"
            className="h-8 rounded border border-[#E5E7EB] px-2 text-xs font-medium text-[#697386] hover:bg-[#F1F3F7] hover:text-[#17191F] dark:border-[#303642] dark:text-[#9CA3AF] dark:hover:bg-[#20242D] dark:hover:text-[#F3F4F6] whitespace-nowrap"
          >
            + Tạo mới
          </button>
          <button
            type="button"
            onClick={() => {
              setNameDraft(matrix.name);
              setRenaming(true);
            }}
            title="Đổi tên ma trận"
            className="h-8 rounded border border-[#E5E7EB] px-2 text-xs text-[#697386] hover:bg-[#F1F3F7] hover:text-[#17191F] dark:border-[#303642] dark:text-[#9CA3AF] dark:hover:bg-[#20242D] dark:hover:text-[#F3F4F6] whitespace-nowrap"
          >
            Đổi tên
          </button>
          <button
            type="button"
            onClick={() => duplicateMatrix(matrix.id)}
            title="Nhân bản ma trận"
            className="h-8 w-8 inline-flex items-center justify-center rounded border border-[#E5E7EB] text-[#697386] hover:bg-[#F1F3F7] hover:text-[#17191F] dark:border-[#303642] dark:text-[#9CA3AF] dark:hover:bg-[#20242D] dark:hover:text-[#F3F4F6]"
            aria-label="Nhân bản ma trận"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {matrices.length > 1 && (
            <button
              type="button"
              onClick={() => removeMatrix(matrix.id)}
              title="Xóa ma trận"
              className="h-8 w-8 inline-flex items-center justify-center rounded border border-[#E5E7EB] text-[#697386] hover:bg-red-50 hover:text-[#DC2626] dark:border-[#303642] dark:text-[#9CA3AF] dark:hover:bg-red-950/30 dark:hover:text-red-400"
              aria-label="Xóa ma trận"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dimension & Quick Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[#697386] dark:text-[#9CA3AF] mr-1">Hàng:</span>
            <button
              type="button"
              onClick={() => resizeMatrix(matrix.id, matrix.rows - 1, matrix.cols)}
              disabled={matrix.rows <= 1}
              aria-label="Bớt hàng"
              className="h-7 w-7 inline-flex items-center justify-center rounded border border-[#E5E7EB] bg-[#F8F9FB] text-[#17191F] hover:bg-[#F1F3F7] disabled:opacity-40 dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-6 text-center font-mono font-medium tabular-nums">
              {matrix.rows}
            </span>
            <button
              type="button"
              onClick={() => resizeMatrix(matrix.id, matrix.rows + 1, matrix.cols)}
              disabled={matrix.rows >= 10}
              aria-label="Thêm hàng"
              className="h-7 w-7 inline-flex items-center justify-center rounded border border-[#E5E7EB] bg-[#F8F9FB] text-[#17191F] hover:bg-[#F1F3F7] disabled:opacity-40 dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[#697386] dark:text-[#9CA3AF] mr-1">Cột:</span>
            <button
              type="button"
              onClick={() => resizeMatrix(matrix.id, matrix.rows, matrix.cols - 1)}
              disabled={matrix.cols <= 1}
              aria-label="Bớt cột"
              className="h-7 w-7 inline-flex items-center justify-center rounded border border-[#E5E7EB] bg-[#F8F9FB] text-[#17191F] hover:bg-[#F1F3F7] disabled:opacity-40 dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-6 text-center font-mono font-medium tabular-nums">
              {matrix.cols}
            </span>
            <button
              type="button"
              onClick={() => resizeMatrix(matrix.id, matrix.rows, matrix.cols + 1)}
              disabled={matrix.cols >= 10}
              aria-label="Thêm cột"
              className="h-7 w-7 inline-flex items-center justify-center rounded border border-[#E5E7EB] bg-[#F8F9FB] text-[#17191F] hover:bg-[#F1F3F7] disabled:opacity-40 dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={fillIdentity}
            className="h-7 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2 text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6] whitespace-nowrap"
          >
            Đơn vị I
          </button>
          <button
            type="button"
            onClick={fillZero}
            className="h-7 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2 text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6] whitespace-nowrap"
          >
            <RotateCcw className="inline h-3 w-3 mr-1" />
            Ma trận 0
          </button>
          <button
            type="button"
            onClick={fillRandom}
            className="h-7 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2 text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6] whitespace-nowrap"
          >
            <Shuffle className="inline h-3 w-3 mr-1" />
            Ngẫu nhiên
          </button>
          <select
            value=""
            onChange={(e) => {
              const ex = PRESET_EXAMPLES[Number(e.target.value)];
              if (ex) updateMatrixData(matrix.id, ex.data.map((r) => [...r]));
            }}
            aria-label="Chọn ma trận mẫu"
            className="h-7 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2 text-xs text-[#17191F] focus:outline-none dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
          >
            <option value="" disabled>
              Ví dụ mẫu...
            </option>
            {PRESET_EXAMPLES.map((ex, idx) => (
              <option key={ex.label} value={idx}>
                {ex.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => (textMode ? setTextMode(false) : openTextMode())}
            className={`h-7 inline-flex items-center gap-1 rounded border px-2 text-xs font-medium whitespace-nowrap ${
              textMode
                ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA]'
                : 'border-[#E5E7EB] bg-[#F8F9FB] text-[#17191F] hover:bg-[#F1F3F7] dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]'
            }`}
          >
            {textMode ? <Grid3X3 className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {textMode ? 'Chế độ bảng' : 'Nhập văn bản'}
          </button>
        </div>
      </div>

      {/* Main Matrix Grid or Text Editor */}
      {textMode ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            rows={Math.max(4, matrix.rows + 1)}
            placeholder="Nhập các phần tử cách nhau bởi dấu cách, tab hoặc dấu phẩy. Mỗi dòng là một hàng. Ví dụ:&#10;1  2  -1/2&#10;3  0  4"
            className="w-full rounded-md border border-[#E5E7EB] bg-[#F8F9FB] p-3 font-mono text-sm text-[#17191F] focus:border-[#2563EB] focus:outline-none dark:border-[#303642] dark:bg-[#111318] dark:text-[#F3F4F6]"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#697386] dark:text-[#9CA3AF]">
              Hỗ trợ số nguyên, thập phân, phân số (ví dụ -3/4) và dữ liệu dán từ Excel/CSV.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTextMode(false)}
                className="h-8 rounded border border-[#E5E7EB] px-3 text-xs font-medium text-[#697386] hover:bg-[#F1F3F7] dark:border-[#303642] dark:text-[#9CA3AF]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={applyTextMode}
                className="h-8 rounded bg-[#2563EB] px-3 text-xs font-medium text-white hover:bg-[#1D4ED8]"
              >
                Áp dụng dữ liệu
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2 overflow-x-auto pb-1">
          <div className="inline-flex min-w-full justify-center py-2">
            <div className="matrix-bracket-shell">
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${matrix.cols}, minmax(56px, 74px))`,
                }}
              >
                {matrix.data.map((row, rIdx) =>
                  row.map((val, cIdx) => {
                    const isErrorCell =
                      error?.cell &&
                      error.cell.matrixName === (slotRole ?? matrix.name) &&
                      error.cell.row === rIdx &&
                      error.cell.col === cIdx;

                    return (
                      <input
                        key={`${rIdx}-${cIdx}`}
                        ref={(el) => {
                          if (!inputRefs.current[rIdx]) inputRefs.current[rIdx] = [];
                          inputRefs.current[rIdx][cIdx] = el;
                        }}
                        type="text"
                        inputMode="text"
                        value={val}
                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                        onPaste={handlePasteInGrid}
                        onFocus={(e) => e.target.select()}
                        aria-label={`Ma trận ${matrix.name}, hàng ${rIdx + 1}, cột ${cIdx + 1}`}
                        className={`h-9 w-full rounded border px-1.5 text-center font-mono text-sm tabular-nums transition-colors focus:outline-none ${
                          isErrorCell
                            ? 'border-[#DC2626] bg-red-50 text-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/30 dark:bg-red-950/30 dark:text-red-400'
                            : 'border-[#E5E7EB] bg-[#F8F9FB] text-[#17191F] hover:border-[#929BAA] focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6] dark:focus:border-[#60A5FA] dark:focus:bg-[#111318]'
                        }`}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <p className="mt-1 text-center text-xs text-[#929BAA] dark:text-[#6B7280]">
            Nhập số nguyên, thập phân hoặc phân số (vd: 3/4). Dùng Tab, Enter hoặc phím mũi tên để di chuyển.
          </p>
        </div>
      )}
    </div>
  );
};
