import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, ListOrdered } from 'lucide-react';
import {
  CalculationStep,
  MatrixDisplayData,
  SolutionDisplayMode,
} from '@/src/types/math';
import { MathFormula } from '@/src/components/math-renderer/MathFormula';

interface StepViewerProps {
  steps: CalculationStep[];
  displayMode: SolutionDisplayMode;
  onChangeDisplayMode: (mode: SolutionDisplayMode) => void;
}

const HighlightedMatrixGrid: React.FC<{
  title: string;
  matrix: MatrixDisplayData;
  highlightedRows?: number[];
  pivotCell?: [number, number];
}> = ({ title, matrix, highlightedRows = [], pivotCell }) => {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-[#697386] dark:text-[#9CA3AF]">{title}</div>
      <div className="overflow-x-auto">
        <div className="matrix-bracket-shell">
          <table className="border-collapse font-mono text-xs tabular-nums">
            <tbody>
              {matrix.entries.map((row, rIdx) => {
                const isRowActive = highlightedRows.includes(rIdx);
                return (
                  <tr key={rIdx}>
                    {row.map((val, cIdx) => {
                      const isPivot = pivotCell && pivotCell[0] === rIdx && pivotCell[1] === cIdx;
                      const isSplitBorder =
                        matrix.augmentedSplitCol !== undefined && cIdx === matrix.augmentedSplitCol;
                      return (
                        <td
                          key={cIdx}
                          className={`px-2 py-1 text-center transition-colors ${
                            isSplitBorder ? 'border-l border-dashed border-[#929BAA] pl-3' : ''
                          } ${
                            isPivot
                              ? 'rounded bg-[#2563EB]/15 font-semibold text-[#2563EB] dark:bg-[#60A5FA]/20 dark:text-[#60A5FA]'
                              : isRowActive
                                ? 'bg-[#F1F3F7] text-[#17191F] dark:bg-[#20242D] dark:text-[#F3F4F6]'
                                : 'text-[#17191F] dark:text-[#F3F4F6]'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const StepViewer: React.FC<StepViewerProps> = ({
  steps,
  displayMode,
  onChangeDisplayMode,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAll, setShowAll] = useState(true);

  if (steps.length === 0) {
    return (
      <p className="text-sm text-[#697386] dark:text-[#9CA3AF]">
        Phép toán này thực hiện trực tiếp theo định nghĩa, không có bước biến đổi trung gian.
      </p>
    );
  }

  const visibleSteps =
    displayMode === 'summary'
      ? steps.filter((s) => s.isMajorStage).length > 0
        ? steps.filter((s) => s.isMajorStage)
        : steps
      : steps;

  const safeIndex = Math.min(activeIndex, visibleSteps.length - 1);
  const stepsToRender = showAll ? visibleSteps : [visibleSteps[safeIndex]];

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3 dark:border-[#303642]">
        <div className="inline-flex items-center rounded-md bg-[#F1F3F7] p-0.5 dark:bg-[#20242D]">
          {(
            [
              { id: 'result', label: 'Chỉ kết quả' },
              { id: 'summary', label: 'Tóm tắt' },
              { id: 'detailed', label: 'Chi tiết' },
            ] as { id: SolutionDisplayMode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChangeDisplayMode(m.id);
                setActiveIndex(0);
              }}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                displayMode === m.id
                  ? 'bg-white text-[#17191F] shadow-xs dark:bg-[#191C23] dark:text-[#F3F4F6]'
                  : 'text-[#697386] hover:text-[#17191F] dark:text-[#9CA3AF] dark:hover:text-[#F3F4F6]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {displayMode !== 'result' && (
          <div className="flex flex-wrap items-center gap-2">
            {!showAll && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  disabled={safeIndex === 0}
                  className="inline-flex h-8 items-center gap-1 rounded border border-[#E5E7EB] px-2.5 text-xs font-medium text-[#17191F] hover:bg-[#F1F3F7] disabled:opacity-40 dark:border-[#303642] dark:text-[#F3F4F6] dark:hover:bg-[#20242D] whitespace-nowrap"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Bước trước
                </button>
                <span className="px-2 font-mono text-xs tabular-nums text-[#697386] dark:text-[#9CA3AF]">
                  {safeIndex + 1} / {visibleSteps.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => Math.min(visibleSteps.length - 1, i + 1))}
                  disabled={safeIndex >= visibleSteps.length - 1}
                  className="inline-flex h-8 items-center gap-1 rounded border border-[#E5E7EB] px-2.5 text-xs font-medium text-[#17191F] hover:bg-[#F1F3F7] disabled:opacity-40 dark:border-[#303642] dark:text-[#F3F4F6] dark:hover:bg-[#20242D] whitespace-nowrap"
                >
                  Bước tiếp theo
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded border border-[#E5E7EB] px-2.5 text-xs font-medium text-[#17191F] hover:bg-[#F1F3F7] dark:border-[#303642] dark:text-[#F3F4F6] dark:hover:bg-[#20242D] whitespace-nowrap"
            >
              {showAll ? (
                <>
                  <ListOrdered className="h-3.5 w-3.5" />
                  Xem từng bước
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Xem toàn bộ lời giải ({visibleSteps.length})
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {displayMode === 'result' ? (
        <div className="flex items-center justify-between rounded-md bg-[#F8F9FB] px-3 py-2.5 text-xs text-[#697386] dark:bg-[#20242D] dark:text-[#9CA3AF]">
          <span>Đang ẩn lời giải từng bước theo chế độ hiển thị &ldquo;Chỉ kết quả&rdquo;.</span>
          <button
            type="button"
            onClick={() => onChangeDisplayMode('detailed')}
            className="inline-flex items-center gap-1 font-medium text-[#2563EB] hover:underline dark:text-[#60A5FA]"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Hiện lời giải chi tiết
          </button>
        </div>
      ) : (
        <ol className="space-y-3">
          {stepsToRender.map((step) => (
            <li
              key={step.stepNumber}
              className="rounded-md border border-[#E5E7EB] bg-[#F8F9FB] p-3.5 dark:border-[#303642] dark:bg-[#111318]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-sm font-semibold text-[#17191F] dark:text-[#F3F4F6]">
                  Bước {step.stepNumber}. {step.stage}
                </div>
                {step.operationNotation && (
                  <div className="rounded bg-white px-2 py-0.5 border border-[#E5E7EB] text-xs dark:bg-[#191C23] dark:border-[#303642]">
                    <MathFormula latex={step.operationNotation} />
                  </div>
                )}
              </div>

              <p className="mt-1.5 text-sm leading-relaxed text-[#697386] dark:text-[#9CA3AF]">
                {step.explanation}
              </p>

              {step.formulaLatex && (
                <div className="mt-2.5 overflow-x-auto rounded border border-[#E5E7EB] bg-white px-3 py-2 dark:border-[#303642] dark:bg-[#191C23]">
                  <MathFormula latex={step.formulaLatex} displayMode />
                </div>
              )}

              {(step.matrixBefore || step.matrixAfter) && (
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {step.matrixBefore && (
                    <HighlightedMatrixGrid
                      title="Trước biến đổi"
                      matrix={step.matrixBefore}
                      highlightedRows={step.highlightedRows}
                      pivotCell={step.pivotCell}
                    />
                  )}
                  {step.matrixBefore && step.matrixAfter && (
                    <span className="text-base font-medium text-[#697386] dark:text-[#9CA3AF]" aria-hidden="true">
                      →
                    </span>
                  )}
                  {step.matrixAfter && (
                    <HighlightedMatrixGrid
                      title={step.matrixBefore ? 'Sau biến đổi' : 'Ma trận ở bước này'}
                      matrix={step.matrixAfter}
                      highlightedRows={step.highlightedRows}
                      pivotCell={step.pivotCell}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
